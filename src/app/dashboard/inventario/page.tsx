import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { money } from "@/lib/es";
import { PageHeader, Card, Badge, ErrorBanner, inputCls, btnPrimary, EmptyState } from "@/components/ui";
import { Package, PackagePlus, TriangleAlert, History } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function create(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "General").trim() || "General";
  const price = Math.round(Number(form.get("price") ?? 0) * 100);
  const cost = Math.round(Number(form.get("cost") ?? 0) * 100);
  const stock = Math.max(0, Number(form.get("stock") ?? 0));
  const minStock = Math.max(0, Number(form.get("minStock") ?? 5));
  if (!name) redirect("/dashboard/inventario?err=Falta+el+nombre");
  const p = await db.product.create({ data: { orgId, name, category, priceCents: price, costCents: cost, stock, minStock } });
  if (stock > 0) await db.stockMovement.create({ data: { orgId, productId: p.id, type: "ENTRADA", qty: stock, reason: "Inventario inicial" } });
  revalidatePath("/dashboard/inventario");
}

async function move(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const productId = String(form.get("productId"));
  const type = String(form.get("type")) as "ENTRADA" | "SALIDA" | "AJUSTE" | "CONSUMO";
  const qty = Number(form.get("qty") ?? 0);
  const reason = String(form.get("reason") ?? "");
  if (!productId || !qty || qty <= 0) redirect("/dashboard/inventario?err=Cantidad+inválida");
  const p = await db.product.findFirst({ where: { id: productId, orgId } });
  if (!p) return;
  let stock = p.stock;
  if (type === "ENTRADA") stock += qty;
  else if (type === "AJUSTE") stock = qty;
  else stock -= qty;
  if (stock < 0) redirect("/dashboard/inventario?err=Stock+insuficiente");
  await db.$transaction([
    db.product.update({ where: { id: p.id }, data: { stock } }),
    db.stockMovement.create({ data: { orgId, productId: p.id, type, qty, reason } }),
  ]);
  revalidatePath("/dashboard/inventario");
}

async function remove(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  await db.product.deleteMany({ where: { id, orgId } });
  revalidatePath("/dashboard/inventario");
}

const MOVE_BADGE = { ENTRADA: "green", SALIDA: "blue", CONSUMO: "orange", AJUSTE: "zinc" } as const;

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { orgId } = await requireTenant();
  const { err } = await searchParams;
  const [products, moves] = await Promise.all([
    db.product.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.stockMovement.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 30, include: { product: true } }),
  ]);
  const low = products.filter((p) => p.stock <= p.minStock);
  const stockValue = products.reduce((a, p) => a + p.stock * p.costCents, 0);
  return (
    <main>
      <PageHeader title="Inventario" sub={`Ceras, shampoos e insumos · ${products.length} productos · ${money(stockValue)} en stock (costo).`} />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      {low.length > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-900">
          <TriangleAlert size={16} /> Stock bajo: {low.map((p) => `${p.name} (${p.stock})`).join(", ")}
        </p>
      )}
      <Card>
        <form action={create} className="grid grid-cols-2 gap-2 md:grid-cols-7">
          <input name="name" required placeholder="Producto" className={`${inputCls} col-span-2`} />
          <input name="category" placeholder="Categoría" className={inputCls} />
          <input name="price" type="number" min="0" step="0.01" placeholder="Precio" className={inputCls} />
          <input name="cost" type="number" min="0" step="0.01" placeholder="Costo" className={inputCls} />
          <input name="stock" type="number" min="0" defaultValue={0} title="Stock inicial" className={inputCls} />
          <button className={btnPrimary}><PackagePlus size={15} /> Agregar</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {products.map((p) => (
          <Card key={p.id} className="!p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-stone-100 p-2.5 text-stone-600"><Package size={18} /></span>
                <div>
                  <p className="font-semibold">{p.stock <= p.minStock && "🔴 "}{p.name}</p>
                  <p className="text-sm text-stone-500">{p.category} · venta {money(p.priceCents)} · <strong className={p.stock <= p.minStock ? "text-red-600" : ""}>stock {p.stock}</strong> (mín {p.minStock})</p>
                </div>
              </div>
              <form action={remove} className="inline"><input type="hidden" name="id" value={p.id} />
                <button className="text-sm text-red-600 underline">Eliminar</button></form>
            </div>
            <form action={move} className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
              <input type="hidden" name="productId" value={p.id} />
              <select name="type" className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" defaultValue="ENTRADA">
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
                <option value="CONSUMO">Consumo</option>
                <option value="AJUSTE">Ajuste</option>
              </select>
              <input name="qty" type="number" min="1" defaultValue={1} className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <input name="reason" placeholder="Motivo" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white">OK</button>
            </form>
          </Card>
        ))}
      </div>
      {products.length === 0 && <div className="mt-4"><EmptyState icon={<Package size={22} />} title="Inventario vacío" sub="Agrega cera, shampoo, cuchillas… y controla existencias." /></div>}
      <Card className="mt-6">
        <h2 className="flex items-center gap-2 font-bold"><History size={17} /> Últimos movimientos</h2>
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {moves.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <Badge color={MOVE_BADGE[m.type]}>{m.type}</Badge>
              <span className="font-medium">{m.product.name}</span>
              <span className="text-stone-500">× {m.qty}{m.reason ? ` · ${m.reason}` : ""}</span>
              <span className="ml-auto text-xs text-stone-400">{m.createdAt.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        {moves.length === 0 && <p className="mt-1 text-sm text-stone-500">Aún no hay movimientos.</p>}
      </Card>
    </main>
  );
}
