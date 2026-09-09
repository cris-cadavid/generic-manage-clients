import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { computeReactivation, buildWaLink, reactivationMessage, reminderMessage } from "@/lib/whatsapp";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { money, cap } from "@/lib/es";
import { Card, StatCard, EmptyState } from "@/components/ui";
import { FadeIn } from "@/components/anim";
import RevenueChart from "@/components/revenue-chart";
import { Banknote, CalendarCheck2, Users, Megaphone, MoonStar, TriangleAlert, ArrowRight, MessageCircle, CalendarPlus, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { orgId, org } = await requireTenant();
  const v = VERTICALS[org.businessType as BusinessType];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const [customers, sales, todayAppts, upcoming, services, staff, products] = await Promise.all([
    db.customer.findMany({ where: { orgId } }),
    db.sale.findMany({ where: { orgId }, orderBy: { date: "asc" }, take: 1000 }),
    db.appointment.findMany({ where: { orgId, startsAt: { gte: today, lt: tomorrow } }, orderBy: { startsAt: "asc" }, include: { customer: true, staff: true, service: true } }),
    db.appointment.findMany({ where: { orgId, startsAt: { gte: tomorrow }, status: { in: ["PENDING", "CONFIRMED"] } }, orderBy: { startsAt: "asc" }, take: 5, include: { customer: true, service: true } }),
    db.service.findMany({ where: { orgId } }),
    db.staff.findMany({ where: { orgId } }),
    db.product.findMany({ where: { orgId } }),
  ]);
  const isNew = customers.length === 0 && services.length === 0 && staff.length === 0;

  const days: { label: string; full: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const nx = new Date(d.getTime() + 86400000);
    days.push({
      label: d.toLocaleDateString("es", { weekday: "narrow" }),
      full: `${d.toLocaleDateString("es", { day: "numeric", month: "short" })} · ${money(sales.filter((s) => s.date >= d && s.date < nx).reduce((a, s) => a + s.amountCents, 0))}`,
      total: sales.filter((s) => s.date >= d && s.date < nx).reduce((a, s) => a + s.amountCents, 0),
    });
  }
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthSales = sales.filter((s) => s.date >= monthStart);
  const monthTotal = monthSales.reduce((a, s) => a + s.amountCents, 0);
  const prevMonth = sales.filter((s) => s.date < monthStart && s.date >= new Date(today.getFullYear(), today.getMonth() - 1, 1))
    .reduce((a, s) => a + s.amountCents, 0);
  const trend = prevMonth > 0 ? Math.round(((monthTotal - prevMonth) / prevMonth) * 100) : null;

  const bySvc = new Map<string, { n: number; total: number }>();
  const byBar = new Map<string, { n: number; total: number }>();
  for (const s of monthSales) {
    if (s.serviceId) { const e = bySvc.get(s.serviceId) ?? { n: 0, total: 0 }; e.n++; e.total += s.amountCents; bySvc.set(s.serviceId, e); }
    if (s.staffId) { const e = byBar.get(s.staffId) ?? { n: 0, total: 0 }; e.n++; e.total += s.amountCents; byBar.set(s.staffId, e); }
  }
  const svcName = new Map(services.map((s) => [s.id, s.name]));
  const barName = new Map(staff.map((s) => [s.id, s.name]));
  const topSvc = [...bySvc.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 4);
  const topBar = [...byBar.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 4);
  const topBarMax = Math.max(1, ...topBar.map(([, e]) => e.total));
  const topSvcMax = Math.max(1, ...topSvc.map(([, e]) => e.total));

  const byCustomer = new Map<string, Date[]>();
  for (const s of sales) {
    if (!s.customerId) continue;
    if (!byCustomer.has(s.customerId)) byCustomer.set(s.customerId, []);
    byCustomer.get(s.customerId)!.push(s.date);
  }
  const cById = new Map(customers.map((c) => [c.id, c]));
  const candidates = computeReactivation(
    [...byCustomer.entries()].map(([id, dates]) => ({ customerId: id, name: cById.get(id)?.name ?? "?", phone: cById.get(id)?.phone ?? "", dates })),
    org.businessType as BusinessType,
  );
  const doneToday = todayAppts.filter((a) => a.status === "COMPLETED").length;

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500 capitalize">{today.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-bold tracking-tight">Hola, así va tu negocio {v.icon}</h1>
        </div>
        <Link href="/dashboard/agenda" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-300">
          <CalendarPlus size={16} /> Nueva {v.appointmentNoun}
        </Link>
      </div>

      {isNew && (
        <Card className="mb-5 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
          <p className="font-semibold">👋 Te dejo el negocio listo en 4 pasos</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
            <li><Link className="font-medium text-stone-900 underline" href="/dashboard/servicios">Crea lo que ofreces</Link> ({v.servicePlural.toLowerCase()})</li>
            <li><Link className="font-medium text-stone-900 underline" href="/dashboard/staff">Agrega tu equipo</Link> ({v.professionalPlural.toLowerCase()}) con su horario</li>
            <li><Link className="font-medium text-stone-900 underline" href="/dashboard/clientes">Registra clientes</Link> y comparte tu <Link className="font-medium text-stone-900 underline" href={`/book/${org.slug}`} target="_blank">link de reservas</Link></li>
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FadeIn delay={0}><StatCard icon={<Banknote size={20} />} label="Ingresos del mes" value={money(monthTotal)}
          sub={trend === null ? "Primer mes con datos" : `${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% vs mes anterior`} accent="bg-amber-400" /></FadeIn>
        <FadeIn delay={0.05}><StatCard icon={<CalendarCheck2 size={20} />} label={`${cap(v.appointmentNoun)}s de hoy`} value={`${todayAppts.filter((a) => a.status !== "CANCELLED").length}`}
          sub={doneToday > 0 ? `${doneToday} completadas` : todayAppts.length ? "Nada completado aún" : "Sin citas hoy"} accent="bg-sky-500" /></FadeIn>
        <FadeIn delay={0.1}><StatCard icon={<Users size={20} />} label="Clientes" value={customers.length}
          sub={`+${customers.filter((c) => c.createdAt >= monthStart).length} este mes`} accent="bg-emerald-500" /></FadeIn>
        <FadeIn delay={0.15}><Link href="/dashboard/reactivar" className="block h-full">
          <StatCard icon={<Megaphone size={20} />} label="Deberían volver" value={candidates.length}
            sub="Toca para contactarlos" accent="bg-orange-500" />
        </Link></FadeIn>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{v.icon} Agenda de hoy</h2>
            <Link href="/dashboard/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900">Ver agenda <ArrowRight size={15} /></Link>
          </div>
          {todayAppts.length === 0 ? (
            <EmptyState icon={<ClipboardList size={22} />} title="Día libre (por ahora)"
              sub="Comparte tu link de reservas o agenda la primera cita del día."
              action={<Link href="/dashboard/agenda" className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white"><CalendarPlus size={15} /> Agendar</Link>} />
          ) : (
            <ol className="relative space-y-0 border-l-2 border-stone-100 pl-0">
              {todayAppts.map((a) => (
                <li key={a.id} className="relative flex flex-wrap items-center justify-between gap-2 py-2.5 pl-5">
                  <span className="absolute -left-[7px] top-3.5 h-3 w-3 rounded-full border-2 border-white bg-amber-400 shadow" />
                  <div className="text-sm">
                    <span className="font-bold tabular-nums">{a.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="ml-2 font-medium">{a.customer.name}</span>
                    <span className="ml-2 text-stone-500">{a.service.name} · {a.staff.name}</span>
                  </div>
                  <a className="inline-flex items-center gap-1 rounded-lg bg-[#25d366] px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-95" target="_blank"
                    href={buildWaLink(a.customer.phone, reminderMessage(a.customer.name, org.name, a.startsAt.toLocaleString()))}>
                    <MessageCircle size={13} /> Recordar
                  </a>
                </li>
              ))}
            </ol>
          )}
          {upcoming.length > 0 && (
            <div className="mt-3 border-t border-stone-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Próximos días</p>
              <ul className="mt-1 text-sm text-stone-600">{upcoming.map((a) => (
                <li key={a.id}>{a.startsAt.toLocaleDateString("es", { weekday: "short", day: "numeric" })} {a.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.customer.name} · {a.service.name}</li>))}</ul>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-bold">💰 Ingresos · 14 días <span className="ml-1 text-sm font-normal text-stone-400">{money(days.reduce((a, d) => a + d.total, 0))} total</span></h2>
          <div className="mt-2"><RevenueChart data={days} /></div>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{v.servicePlural} top del mes</p>
              {topSvc.length === 0 ? <p className="mt-1 text-sm text-stone-500">Sin ventas este mes.</p> :
                <ul className="mt-2 space-y-2">{topSvc.map(([id, e]) => (
                  <li key={id}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{svcName.get(id)}</span><span className="text-stone-500">{e.n} × {money(e.total)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(e.total / topSvcMax) * 100}%` }} /></div>
                  </li>))}</ul>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{v.professionalPlural} top del mes</p>
              {topBar.length === 0 ? <p className="mt-1 text-sm text-stone-500">Sin ventas este mes.</p> :
                <ul className="mt-2 space-y-2">{topBar.map(([id, e]) => (
                  <li key={id}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{v.icon} {barName.get(id)}</span><span className="text-stone-500">{e.n} × {money(e.total)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-stone-900" style={{ width: `${(e.total / topBarMax) * 100}%` }} /></div>
                  </li>))}</ul>}
            </div>
          </div>
        </Card>
      </div>

      {(candidates.length > 0 || products.some((p) => p.stock <= p.minStock)) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {candidates.length > 0 && (
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">⚠️ Deberían volver ({candidates.length})</h2>
                <Link href="/dashboard/reactivar" className="inline-flex items-center gap-1 text-sm font-medium text-orange-700">Ver todos <ArrowRight size={15} /></Link>
              </div>
              <ul className="mt-3 space-y-2">{candidates.slice(0, 3).map((c) => (
                <li key={c.customerId} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 p-2.5 text-sm">
                  <span><strong>{c.name}</strong> <span className="text-stone-500">· hace {c.daysSince}d</span></span>
                  <a className="inline-flex items-center gap-1 rounded-lg bg-[#25d366] px-2.5 py-1 text-xs font-semibold text-white" target="_blank"
                    href={buildWaLink(c.phone, reactivationMessage(c.name, org.name, c.daysSince))}><MessageCircle size={13} /> WhatsApp</a>
                </li>))}</ul>
            </Card>
          )}
          {products.some((p) => p.stock <= p.minStock) && (
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <div className="flex items-center gap-2 font-bold"><TriangleAlert size={18} /> Stock bajo</div>
              <ul className="mt-2 text-sm text-stone-600">
                {products.filter((p) => p.stock <= p.minStock).slice(0, 5).map((p) => <li key={p.id}>{p.name} · quedan <strong>{p.stock}</strong></li>)}
              </ul>
              <Link href="/dashboard/inventario" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700">Reponer <ArrowRight size={15} /></Link>
            </Card>
          )}
          {candidates.length === 0 && (
            <Card>
              <div className="flex items-center gap-2 font-bold"><MoonStar size={18} /> Todo al día</div>
              <p className="mt-1 text-sm text-stone-500">Nadie pendiente de volver. Buen trabajo 💪</p>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
