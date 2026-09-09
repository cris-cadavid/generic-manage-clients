import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { money } from "@/lib/es";
import { PageHeader, Card, Badge, ErrorBanner, inputCls, btnPrimary, EmptyState } from "@/components/ui";
import { ShoppingBag } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

async function create(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const customerId = String(form.get("customerId") || "") || null;
  const staffId = String(form.get("staffId") || "") || null;
  const serviceId = String(form.get("serviceId") || "") || null;
  const amount = Math.round(Number(form.get("amount") ?? 0) * 100);
  if (!amount || amount <= 0) redirect("/dashboard/ventas?err=Valor+inválido");
  await db.sale.create({ data: { orgId, customerId, staffId, serviceId, amountCents: amount } });
  revalidatePath("/dashboard/ventas");
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { orgId, org } = await requireTenant();
  const v = VERTICALS[org.businessType as BusinessType];
  const { err } = await searchParams;
  const [sales, customers, staff, services] = await Promise.all([
    db.sale.findMany({ where: { orgId }, orderBy: { date: "desc" }, take: 50, include: { customer: true, staff: true, service: true } }),
    db.customer.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.staff.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.service.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
  ]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTotal = sales.filter((s) => s.date >= today).reduce((a, s) => a + s.amountCents, 0);
  return (
    <main>
      <PageHeader title="Ventas" sub={`Registra cada ${v.serviceLabel.toLowerCase()} cobrado · hoy van ${money(todayTotal)}.`} />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card>
        <form action={create} className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <select name="customerId" className={inputCls} defaultValue="">
            <option value="">Cliente</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="serviceId" className={inputCls} defaultValue="">
            <option value="">{v.serviceLabel}</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.priceCents)})</option>)}
          </select>
          <select name="staffId" className={inputCls} defaultValue="">
            <option value="">{v.professionalLabel}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input name="amount" type="number" min="0" step="0.01" required placeholder="Valor cobrado" className={inputCls} />
          <button className={btnPrimary}>Registrar</button>
        </form>
      </Card>
      <div className="mt-4 space-y-2">
        {sales.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2 !p-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-xl bg-stone-100 p-2 text-stone-600"><ShoppingBag size={16} /></span>
              <div>
                <p className="font-semibold">{s.customer?.name ?? "Venta mostrador"} <span className="font-bold text-emerald-700">{money(s.amountCents)}</span></p>
                <p className="text-stone-500">{s.date.toLocaleString()} · {s.service?.name ?? "—"} · 💈 {s.staff?.name ?? "—"}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {sales.length === 0 && <div className="mt-4"><EmptyState icon={<ShoppingBag size={22} />} title="Sin ventas registradas" sub="Cada venta alimenta el historial del cliente y la reactivación." /></div>}
    </main>
  );
}
