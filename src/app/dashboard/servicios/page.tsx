import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { money } from "@/lib/es";
import { PageHeader, Card, Badge, ErrorBanner, inputCls, btnPrimary, EmptyState } from "@/components/ui";
import { Scissors, Clock, Pencil, Trash2, Power } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

async function create(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const name = String(form.get("name") ?? "").trim();
  const price = Math.round(Number(form.get("price") ?? 0) * 100);
  const durationMin = Math.max(5, Number(form.get("durationMin") ?? 30));
  if (!name) redirect("/dashboard/servicios?err=Falta+el+nombre");
  await db.service.create({ data: { orgId, name, priceCents: price, durationMin } });
  revalidatePath("/dashboard/servicios");
}

async function toggle(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const s = await db.service.findFirst({ where: { id, orgId } });
  if (!s) return;
  await db.service.update({ where: { id }, data: { active: !s.active } });
  revalidatePath("/dashboard/servicios");
}

async function remove(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const used = await db.appointment.count({ where: { orgId, serviceId: id, status: { in: ["PENDING", "CONFIRMED"] } } });
  if (used > 0) redirect("/dashboard/servicios?err=No+se+puede+eliminar:+tiene+reservas+activas.+Desactívalo.");
  await db.service.deleteMany({ where: { id, orgId } });
  revalidatePath("/dashboard/servicios");
}

export default async function ServiciosPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { orgId, org } = await requireTenant();
  const { err } = await searchParams;
  const v = VERTICALS[org.businessType as BusinessType];
  const services = await db.service.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  return (
    <main>
      <PageHeader title={v.servicePlural} sub="Lo que ofreces, con precio y duración." />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card>
        <form action={create} className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <input name="name" required placeholder={`Nombre (ej. ${v.serviceLabel.toLowerCase()} estrella)`} className={`${inputCls} col-span-2 md:col-span-1`} />
          <input name="price" type="number" min="0" step="0.01" placeholder="Precio" className={inputCls} />
          <input name="durationMin" type="number" min="5" defaultValue={30} title="Duración min" className={inputCls} />
          <button className={btnPrimary}>Agregar</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {services.map((s) => (
          <Card key={s.id} className={`!p-4 ${s.active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><Scissors size={18} /></span>
                <div>
                  <p className="font-semibold">{s.name} {!s.active && <Badge color="zinc">inactivo</Badge>}</p>
                  <p className="flex items-center gap-1 text-sm text-stone-500"><Clock size={13} /> {s.durationMin} min · <strong className="text-stone-800">{money(s.priceCents)}</strong></p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-1 border-t border-stone-100 pt-2.5 text-sm">
              <Link href={`/dashboard/servicios/${s.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-stone-600 hover:bg-stone-100"><Pencil size={14} /> Editar</Link>
              <form action={toggle} className="inline"><input type="hidden" name="id" value={s.id} />
                <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-stone-600 hover:bg-stone-100"><Power size={14} /> {s.active ? "Desactivar" : "Activar"}</button></form>
              <form action={remove} className="inline"><input type="hidden" name="id" value={s.id} />
                <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Eliminar</button></form>
            </div>
          </Card>
        ))}
      </div>
      {services.length === 0 && <div className="mt-4"><EmptyState icon={<Scissors size={22} />} title={`Sin ${v.servicePlural.toLowerCase()}`} sub="Crea lo que ofreces: es lo que luego se reserva y se vende." /></div>}
    </main>
  );
}
