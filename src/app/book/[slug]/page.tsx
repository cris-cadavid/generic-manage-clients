import { db } from "@/lib/db";
import { DEFAULT_SCHEDULE, freeSlots, nextOpenDays, type Schedule } from "@/lib/slots";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { normalizePhone } from "@/lib/whatsapp";
import { money } from "@/lib/es";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Scissors, HandMetal, CalendarDays, Clock, User, ArrowLeft, CheckCircle2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

function schedOf(staff: { schedule: unknown }): Schedule {
  const s = staff.schedule as Schedule | null;
  return s?.days ? s : DEFAULT_SCHEDULE;
}

async function book(form: FormData) {
  "use server";
  const orgId = String(form.get("orgId"));
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const serviceId = String(form.get("serviceId"));
  const staffId = String(form.get("staffId"));
  const date = String(form.get("date"));
  const time = String(form.get("time"));
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || !name || !phone || !email || !serviceId || !staffId || !date || !time)
    redirect(`/book/${org?.slug ?? "error"}?err=Revisa+los+datos:+teléfono+de+10+dígitos+y+correo+válido`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/book/${org.slug}?err=Correo+no+válido`);
  const [service, barber] = await Promise.all([
    db.service.findFirst({ where: { id: serviceId, orgId, active: true } }),
    db.staff.findFirst({ where: { id: staffId, orgId, active: true } }),
  ]);
  if (!service || !barber) redirect(`/book/${org.slug}?err=Selección+no+disponible`);
  const startsAt = new Date(`${date}T${time}`);
  if (isNaN(startsAt.getTime()) || startsAt < new Date()) redirect(`/book/${org.slug}?err=Fecha+pasada+o+inválida`);
  const endsAt = new Date(startsAt.getTime() + (service.durationMin + service.bufferMin) * 60000);
  const clash = await db.appointment.findFirst({
    where: { orgId, staffId, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  });
  if (clash) redirect(`/book/${org.slug}?serv=${serviceId}&barb=${staffId}&fecha=${date}&err=Ese+horario+se+acaba+de+ocupar.+Elige+otro.`);
  // Identidad única por negocio: teléfono y correo no se pueden repetir
  let customer = await db.customer.findFirst({ where: { orgId, phone } });
  if (customer) {
    if (!customer.email) await db.customer.update({ where: { id: customer.id }, data: { email } });
    else if (customer.email !== email) redirect(`/book/${org.slug}?err=Ese+teléfono+ya+está+registrado+con+otro+correo.`);
  } else {
    const byEmail = await db.customer.findFirst({ where: { orgId, email } });
    if (byEmail) redirect(`/book/${org.slug}?err=Ese+correo+ya+está+registrado+con+otro+teléfono.`);
    customer = await db.customer.create({ data: { orgId, name, phone, email } });
  }
  await db.appointment.create({ data: { orgId, customerId: customer.id, staffId, serviceId, startsAt, endsAt, status: "PENDING" } });
  const { pushToOrg } = await import("@/lib/push");
  await pushToOrg(orgId, "📅 Nueva reserva", `${name} · ${service.name} · ${startsAt.toLocaleString()}`);
  redirect(`/book/${org.slug}/ok?n=${encodeURIComponent(name)}`);
}

type SP = { serv?: string; barb?: string; fecha?: string; hora?: string; err?: string };

export default async function PublicBookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org) return <main className="p-8 text-center">Negocio no encontrado. Pide tu enlace al comercio.</main>;
  const v = VERTICALS[org.businessType as BusinessType];
  const STEPS = [
    { n: 1, label: v.serviceLabel, icon: Scissors },
    { n: 2, label: v.professionalLabel, icon: HandMetal },
    { n: 3, label: "Día", icon: CalendarDays },
    { n: 4, label: "Hora", icon: Clock },
    { n: 5, label: "Datos", icon: User },
  ];
  const [services, staff] = await Promise.all([
    db.service.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } }),
    db.staff.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } }),
  ]);
  const step = !sp.serv ? 1 : !sp.barb ? 2 : !sp.fecha ? 3 : !sp.hora ? 4 : 5;
  const service = services.find((s) => s.id === sp.serv);
  const barber = staff.find((s) => s.id === sp.barb);

  let slots: string[] = [];
  let days: string[] = [];
  if (step >= 3 && service && barber) {
    const sched = schedOf(barber);
    days = nextOpenDays(sched);
    if (sp.fecha) {
      const busy = await db.appointment.findMany({
        where: {
          orgId: org.id, staffId: barber.id, status: { in: ["PENDING", "CONFIRMED"] },
          startsAt: { gte: new Date(`${sp.fecha}T00:00:00`), lt: new Date(`${sp.fecha}T23:59:59`) },
        },
      });
      slots = freeSlots(sp.fecha, sched, service.durationMin, service.bufferMin, busy);
    }
  }

  const qs = (o: SP) => "?" + new URLSearchParams(Object.entries(o).filter(([, v]) => v).map(([k, v]) => [k, v as string])).toString();

  return (
    <main className="min-h-screen bg-ink-950 py-8 text-stone-100 md:py-14">
      <div className="mx-auto max-w-3xl px-4">
        <div className="overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl md:grid md:grid-cols-5">
          {/* Resumen */}
          <div className="bg-stone-950 p-6 text-stone-200 md:col-span-2">
            <p className="text-3xl">{v.icon}</p>
            <h1 className="mt-2 text-xl font-bold text-white">{org.name}</h1>
            <p className="text-sm text-stone-400">Reserva en menos de un minuto. Sin crear cuenta.</p>
            <ol className="mt-5 space-y-2.5">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const done = step > s.n;
                const cur = step === s.n;
                return (
                  <li key={s.n} className={cn("flex items-center gap-2.5 text-sm", done || cur ? "text-white" : "text-stone-500")}>
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border",
                      done ? "border-amber-400 bg-amber-400 text-stone-950" : cur ? "border-amber-400 text-amber-300" : "border-stone-700")}>
                      {done ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                    </span>
                    {s.label}
                  </li>
                );
              })}
            </ol>
            {(service || barber || sp.fecha) && (
              <div className="mt-5 rounded-2xl bg-white/5 p-3 text-sm">
                {service && <p>✂️ <strong>{service.name}</strong> · {money(service.priceCents)}</p>}
                {barber && <p>{v.icon} {barber.name}</p>}
                {sp.fecha && <p>📅 {sp.fecha}{sp.hora ? ` · ${sp.hora}` : ""}</p>}
              </div>
            )}
          </div>

          {/* Paso actual */}
          <div className="p-6 md:col-span-3">
            {sp.err && <p className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><TriangleAlert size={15} /> {decodeURIComponent(sp.err)}</p>}

            {step === 1 && (
              <div className="space-y-2">
                <h2 className="font-bold">¿Qué te hacemos?</h2>
                {services.map((s) => (
                  <Link key={s.id} href={`/book/${slug}${qs({ serv: s.id })}`} className="flex items-center justify-between rounded-2xl border border-stone-200 p-4 transition hover:border-amber-500 hover:bg-amber-50/50">
                    <span className="font-medium">{s.name}<span className="ml-2 text-sm font-normal text-stone-500">{s.durationMin} min</span></span>
                    <strong>{money(s.priceCents)}</strong>
                  </Link>
                ))}
                {services.length === 0 && <p className="text-sm text-stone-500">Este negocio aún no publica reservas.</p>}
              </div>
            )}

            {step === 2 && service && (
              <div className="space-y-2">
                <h2 className="font-bold">¿Con quién? <span className="font-normal text-stone-500">· {service.name}</span></h2>
                <p className="-mt-1 text-xs text-stone-400">Elige tu {v.professionalLabel.toLowerCase()} favorito</p>
                {staff.map((b) => (
                  <Link key={b.id} href={`/book/${slug}${qs({ serv: service.id, barb: b.id })}`} className="flex items-center gap-3 rounded-2xl border border-stone-200 p-4 transition hover:border-amber-500 hover:bg-amber-50/50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-amber-400">{b.name.slice(0, 1)}</span>
                    <span className="font-medium">{b.name}</span>
                  </Link>
                ))}
                <Link href={`/book/${slug}`} className="inline-flex items-center gap-1 pt-1 text-sm text-stone-500 hover:text-stone-900"><ArrowLeft size={14} /> Cambiar servicio</Link>
              </div>
            )}

            {step === 3 && service && barber && (
              <div>
                <h2 className="font-bold">¿Qué día? <span className="font-normal text-stone-500">· con {barber.name}</span></h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {days.map((d) => (
                    <Link key={d} href={`/book/${slug}${qs({ serv: service.id, barb: barber.id, fecha: d })}`}
                      className="rounded-2xl border border-stone-200 p-3 text-center transition hover:border-amber-500 hover:bg-amber-50/50">
                      <span className="block text-xs uppercase text-stone-400">{new Date(d + "T12:00:00").toLocaleDateString("es", { weekday: "short" })}</span>
                      <span className="text-lg font-bold">{new Date(d + "T12:00:00").getDate()}</span>
                      <span className="block text-xs text-stone-500">{new Date(d + "T12:00:00").toLocaleDateString("es", { month: "short" })}</span>
                    </Link>
                  ))}
                </div>
                <Link href={`/book/${slug}${qs({ serv: service.id })}`} className="inline-flex items-center gap-1 pt-3 text-sm text-stone-500 hover:text-stone-900"><ArrowLeft size={14} /> Cambiar barbero</Link>
              </div>
            )}

            {step === 4 && service && barber && sp.fecha && (
              <div>
                <h2 className="font-bold">¿A qué hora? <span className="font-normal text-stone-500">· {sp.fecha}</span></h2>
                {slots.length === 0 && <p className="mt-2 text-sm text-stone-500">Ese día está lleno. Elige otro día.</p>}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {slots.map((t) => (
                    <Link key={t} href={`/book/${slug}${qs({ serv: service.id, barb: barber.id, fecha: sp.fecha, hora: t })}`}
                      className="rounded-xl border border-stone-200 py-2 text-center text-sm font-semibold tabular-nums transition hover:border-amber-500 hover:bg-amber-50">{t}</Link>
                  ))}
                </div>
                <Link href={`/book/${slug}${qs({ serv: service.id, barb: barber.id })}`} className="inline-flex items-center gap-1 pt-3 text-sm text-stone-500 hover:text-stone-900"><ArrowLeft size={14} /> Cambiar día</Link>
              </div>
            )}

            {step === 5 && service && barber && sp.fecha && sp.hora && (
              <form action={book} className="space-y-3">
                <h2 className="font-bold">Tus datos</h2>
                <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm">✂️ {service.name} · {v.icon} {barber.name} · 📅 {sp.fecha} · 🕒 {sp.hora}</p>
                <input type="hidden" name="orgId" value={org.id} />
                <input type="hidden" name="serviceId" value={service.id} />
                <input type="hidden" name="staffId" value={barber.id} />
                <input type="hidden" name="date" value={sp.fecha} />
                <input type="hidden" name="time" value={sp.hora} />
          <input name="name" required placeholder="Tu nombre" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          <input name="email" required type="email" placeholder="Tu correo" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          <input name="phone" required placeholder="Tu WhatsApp" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                <button className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-stone-950 transition hover:bg-amber-300">Confirmar reserva</button>
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-stone-500">Sin crear cuenta · confirmación por WhatsApp</p>
      </div>
    </main>
  );
}
