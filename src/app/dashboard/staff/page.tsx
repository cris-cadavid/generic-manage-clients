import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { PageHeader, Card, ErrorBanner, inputCls, btnPrimary, EmptyState } from "@/components/ui";
import { HandMetal, Pencil, Trash2, UserPlus } from "lucide-react";
import { DEFAULT_SCHEDULE } from "@/lib/slots";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

async function create(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const serviceId = String(form.get("serviceId") ?? "");
  if (!name) redirect("/dashboard/staff?err=Falta+el+nombre");
  await db.staff.create({ data: { orgId, name, phone, services: serviceId ? [serviceId] : [], schedule: DEFAULT_SCHEDULE } });
  revalidatePath("/dashboard/staff");
}

async function remove(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const used = await db.appointment.count({ where: { orgId, staffId: id, status: { in: ["PENDING", "CONFIRMED"] } } });
  if (used > 0) redirect("/dashboard/staff?err=No+se+puede+eliminar:+tiene+reservas+activas.");
  await db.staff.deleteMany({ where: { id, orgId } });
  revalidatePath("/dashboard/staff");
}

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { orgId, org } = await requireTenant();
  const v = VERTICALS[org.businessType as BusinessType];
  const { err } = await searchParams;
  const [staff, services] = await Promise.all([
    db.staff.findMany({ where: { orgId }, orderBy: { name: "asc" }, include: { _count: { select: { appointments: true } } } }),
    db.service.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const svcById = new Map(services.map((s) => [s.id, s.name]));
  return (
    <main>
      <PageHeader title={v.professionalPlural} sub={`Quién atiende, qué hace y en qué horario.`} />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card>
        <form action={create} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input name="name" required placeholder={`Nombre del ${v.professionalLabel.toLowerCase()}`} className={inputCls} />
          <input name="phone" placeholder="Teléfono" className={inputCls} />
          <select name="serviceId" className={inputCls} defaultValue="">
            <option value="">{v.serviceLabel} que realiza</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className={`${btnPrimary} gap-1.5`}><UserPlus size={15} /> Agregar</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {staff.map((p) => (
          <Card key={p.id} className="!p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-base font-bold text-amber-400">
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-stone-500">{p.services.map((id) => svcById.get(id) ?? "?").join(" · ") || "Sin servicios asignados"} · {p._count.appointments} citas totales</p>
              </div>
            </div>
            <div className="mt-3 flex gap-1 border-t border-stone-100 pt-2.5 text-sm">
              <Link href={`/dashboard/staff/${p.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-stone-600 hover:bg-stone-100"><Pencil size={14} /> Editar y horario</Link>
              <form action={remove} className="inline"><input type="hidden" name="id" value={p.id} />
                <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} /> Eliminar</button></form>
            </div>
          </Card>
        ))}
      </div>
      {staff.length === 0 && <div className="mt-4"><EmptyState icon={<HandMetal size={22} />} title={`Sin ${v.professionalPlural.toLowerCase()}`} sub="Agrega quién atiende: la agenda y la reserva pública los necesitan." /></div>}
    </main>
  );
}
