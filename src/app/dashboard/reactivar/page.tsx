import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { computeReactivation, buildWaLink, reactivationMessage } from "@/lib/whatsapp";
import { type BusinessType } from "@/lib/verticals";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Megaphone, MessageCircle, MoonStar } from "lucide-react";

export default async function ReactivarPage() {
  const { orgId, org } = await requireTenant();
  const [customers, sales] = await Promise.all([
    db.customer.findMany({ where: { orgId } }),
    db.sale.findMany({ where: { orgId }, orderBy: { date: "asc" }, take: 1000 }),
  ]);
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

  return (
    <main>
      <PageHeader title={`Clientes que deberían volver`} sub="Hoy − última visita > frecuencia del cliente + 3 días. Escríbeles con un toque." />
      {candidates.length === 0 ? (
        <EmptyState icon={<MoonStar size={22} />} title="Nada por aquí 🎉" sub="Cuando un cliente tarde más de lo normal en volver, aparecerá en esta lista con su botón de WhatsApp." />
      ) : (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50/60 to-white">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-900"><Megaphone size={16} /> {candidates.length} cliente(s) para recuperar</p>
          <ul className="mt-3 space-y-2">
            {candidates.map((c) => (
              <li key={c.customerId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-100 bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-800">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold">{c.name} <span className="font-normal text-stone-500">{c.phone}</span></p>
                    <p className="text-sm text-stone-500">Última: {c.lastVisit.toLocaleDateString()} (hace {c.daysSince}d) · cada {c.avgFreqDays ? `~${Math.round(c.avgFreqDays)}d` : "—"}</p>
                  </div>
                </div>
                <a className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95" target="_blank"
                  href={buildWaLink(c.phone, reactivationMessage(c.name, org.name, c.daysSince))}><MessageCircle size={15} /> Recuperar</a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
