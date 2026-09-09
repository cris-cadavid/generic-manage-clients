import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { STATUS_ES, STATUS_BADGE } from "@/lib/es";
import { PageHeader, Card, Badge, ErrorBanner, inputCls, btnPrimary } from "@/components/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

async function create(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const customerId = String(form.get("customerId"));
  const staffId = String(form.get("staffId"));
  const serviceId = String(form.get("serviceId"));
  const date = String(form.get("date"));
  const time = String(form.get("time"));
  if (!customerId || !staffId || !serviceId || !date || !time) redirect("/dashboard/agenda?err=Faltan+datos+de+la+reserva");
  const service = await db.service.findFirst({ where: { id: serviceId, orgId } });
  if (!service) redirect("/dashboard/agenda?err=Servicio+no+válido");
  const startsAt = new Date(`${date}T${time}`);
  if (isNaN(startsAt.getTime()) || startsAt < new Date(Date.now() - 60000)) redirect("/dashboard/agenda?err=Fecha+pasada+o+inválida");
  const endsAt = new Date(startsAt.getTime() + (service.durationMin + service.bufferMin) * 60000);
  const clash = await db.appointment.findFirst({
    where: { orgId, staffId, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  });
  if (clash) redirect("/dashboard/agenda?err=Ese+profesional+ya+tiene+una+reserva+en+ese+horario");
  await db.appointment.create({ data: { orgId, customerId, staffId, serviceId, startsAt, endsAt, status: "CONFIRMED" } });
  revalidatePath("/dashboard/agenda");
}

async function setStatus(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  await db.appointment.updateMany({ where: { id, orgId }, data: { status } });
  revalidatePath("/dashboard/agenda");
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ err?: string; view?: string; day?: string }> }) {
  const { orgId, org } = await requireTenant();
  const v = VERTICALS[org.businessType as BusinessType];
  const { err, view, day } = await searchParams;
  const base = day ? new Date(`${day}T12:00:00`) : new Date();
  const start = new Date(base); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (view === "week") end.setDate(end.getDate() + 7);
  else end.setDate(end.getDate() + 1);

  const [appointments, customers, staff, services] = await Promise.all([
    db.appointment.findMany({ where: { orgId, startsAt: { gte: new Date(start.getTime() - 86400000), lt: end } }, orderBy: { startsAt: "asc" }, take: 100, include: { customer: true, staff: true, service: true } }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.staff.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } }),
    db.service.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const ready = customers.length > 0 && staff.length > 0 && services.length > 0;
  const dayStr = start.toISOString().slice(0, 10);

  return (
    <main>
      <PageHeader title="Agenda" sub={`Reservas, reprogramación y estados. Sin doble reserva por ${v.professionalLabel.toLowerCase()}.`}
        action={<div className="flex gap-2 text-sm">
          <Link className={`rounded-xl border px-3 py-1.5 ${view !== "week" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`} href="/dashboard/agenda">Día</Link>
          <Link className={`rounded-xl border px-3 py-1.5 ${view === "week" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`} href="/dashboard/agenda?view=week">Semana</Link>
        </div>} />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      {!ready && <p className="mt-2 text-sm text-stone-500">Para reservar necesitas al menos 1 cliente, 1 barbero y 1 servicio activo.</p>}
      <Card>
        <form action={create} className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <select name="customerId" required className={inputCls} defaultValue="">
            <option value="" disabled>Cliente</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="staffId" required className={inputCls} defaultValue="">
            <option value="" disabled>{v.professionalLabel}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="serviceId" required className={inputCls} defaultValue="">
            <option value="" disabled>{v.serviceLabel}</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin}m)</option>)}
          </select>
          <input name="date" type="date" required defaultValue={dayStr} className={inputCls} />
          <input name="time" type="time" required className={inputCls} />
          <button className={btnPrimary}>Reservar</button>
        </form>
      </Card>
      <div className="mt-4 space-y-2">
        {appointments.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <div className="text-sm">
              <span className="font-bold tabular-nums">{a.startsAt.toLocaleString([], { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="ml-2 font-medium">{a.customer.name}</span>
              <span className="ml-2 text-stone-500">{a.service.name} · 💈 {a.staff.name}</span>{" "}
              <Badge color={STATUS_BADGE[a.status]}>{STATUS_ES[a.status]}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link className="font-medium text-stone-600 underline" href={`/dashboard/agenda/${a.id}`}>Reprogramar</Link>
              <form action={setStatus} className="inline-flex gap-1">
                <input type="hidden" name="id" value={a.id} />
                <select name="status" defaultValue={a.status} className="rounded-lg border border-stone-300 px-1.5 py-1 text-sm">
                  {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => <option key={s} value={s}>{STATUS_ES[s]}</option>)}
                </select>
                <button className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-medium text-white">OK</button>
              </form>
            </div>
          </Card>
        ))}
      </div>
      {appointments.length === 0 && <p className="mt-3 text-sm text-stone-500">Sin reservas en este rango.</p>}
    </main>
  );
}
