import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { buildWaLink, reactivationMessage } from "@/lib/whatsapp";
import { money, STATUS_ES, STATUS_BADGE } from "@/lib/es";
import { Card, Badge } from "@/components/ui";
import { MessageCircle, Cake, StickyNote, ArrowLeft, Pencil, ReceiptText, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClienteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId, org } = await requireTenant();
  const c = await db.customer.findFirst({
    where: { id, orgId },
    include: {
      sales: { orderBy: { date: "desc" }, take: 20, include: { service: true, staff: true } },
      appointments: { orderBy: { startsAt: "desc" }, take: 20, include: { service: true, staff: true } },
    },
  });
  if (!c) notFound();
  const total = c.sales.reduce((a, s) => a + s.amountCents, 0);
  const last = c.sales[0]?.date;
  const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
  const fav = c.sales.length > 0
    ? Object.entries(c.sales.reduce<Record<string, number>>((m, s) => { if (s.service) m[s.service.name] = (m[s.service.name] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;

  return (
    <main>
      <Link href="/dashboard/clientes" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"><ArrowLeft size={15} /> Clientes</Link>
      <Card className="mt-3 bg-gradient-to-br from-stone-900 to-stone-800 !text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-xl font-bold text-stone-950">
              {c.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-bold">{c.name}</h1>
              <p className="text-sm text-stone-300">{c.phone}{c.email ? ` · ${c.email}` : ""}{c.birthdate ? ` · 🎂 ${c.birthdate.toLocaleDateString()}` : ""}</p>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <Link href={`/dashboard/clientes/${c.id}/editar`} className="inline-flex items-center gap-1 rounded-xl border border-white/20 px-3 py-1.5 font-medium hover:bg-white/10"><Pencil size={14} /> Editar</Link>
            <a className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] px-3 py-1.5 font-semibold text-white" target="_blank"
              href={buildWaLink(c.phone, reactivationMessage(c.name, org.name, days ?? 0))}><MessageCircle size={15} /> WhatsApp</a>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-bold">{c.sales.length}</p><p className="text-xs text-stone-300">visitas</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-bold">{money(total)}</p><p className="text-xs text-stone-300">acumulado</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-bold">{days === null ? "—" : `${days}d`}</p><p className="text-xs text-stone-300">desde última visita</p></div>
        </div>
        {(fav || c.notes) && (
          <p className="mt-3 text-sm text-stone-300">
            {fav && <span>⭐ Favorito: {fav} · </span>}
            {c.notes && <span className="inline-flex items-center gap-1"><StickyNote size={13} /> {c.notes}</span>}
            {c.birthdate && <span className="ml-2 inline-flex items-center gap-1"><Cake size={13} /> {c.birthdate.toLocaleDateString()}</span>}
          </p>
        )}
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><ReceiptText size={17} /> Historial de visitas</h2>
          {c.sales.length === 0 && <p className="mt-1 text-sm text-stone-500">Sin visitas. <Link className="underline" href="/dashboard/ventas">Registrar la primera</Link></p>}
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {c.sales.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 py-2">
                <span>{s.date.toLocaleDateString()} · {s.service?.name ?? "—"} <span className="text-stone-400">· 💈 {s.staff?.name ?? "—"}</span></span>
                <strong>{money(s.amountCents)}</strong>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><CalendarDays size={17} /> Reservas</h2>
          {c.appointments.length === 0 && <p className="mt-1 text-sm text-stone-500">Sin reservas.</p>}
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {c.appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <span>{a.startsAt.toLocaleString()} · {a.service.name}</span>
                <Badge color={STATUS_BADGE[a.status]}>{STATUS_ES[a.status]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
