import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { Card, Field, inputCls, btnPrimary, ErrorBanner } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import ScheduleEditor, { parseSchedule } from "@/components/schedule-editor";

async function save(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const serviceIds = form.getAll("serviceIds").map(String);
  if (!name) redirect(`/dashboard/staff/${id}?err=Falta+el+nombre`);
  await db.staff.updateMany({ where: { id, orgId }, data: { name, phone, services: serviceIds, schedule: parseSchedule(form) } });
  redirect("/dashboard/staff");
}

export default async function EditStaff({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params;
  const { err } = await searchParams;
  const { orgId } = await requireTenant();
  const [p, services, org] = await Promise.all([
    db.staff.findFirst({ where: { id, orgId } }),
    db.service.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } }),
    db.organization.findUnique({ where: { id: orgId } }),
  ]);
  if (!p) redirect("/dashboard/staff");
  const v = VERTICALS[(org?.businessType ?? "other") as BusinessType];
  return (
    <main className="max-w-xl">
      <Link href="/dashboard/staff" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"><ArrowLeft size={15} /> {v.professionalPlural}</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Editar {v.professionalLabel.toLowerCase()}</h1>
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card className="mt-4">
        <form action={save} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre"><input name="name" defaultValue={p.name} required className={inputCls} /></Field>
            <Field label="Teléfono"><input name="phone" defaultValue={p.phone ?? ""} className={inputCls} /></Field>
          </div>
          <fieldset className="text-sm font-medium text-stone-700">{v.servicePlural} que realiza
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {services.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 font-normal transition has-checked:border-amber-500 has-checked:bg-amber-50">
                  <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={p.services.includes(s.id)} className="accent-amber-500" /> {s.name}
                </label>
              ))}
              {services.length === 0 && <span className="font-normal text-stone-500">Primero crea {v.servicePlural.toLowerCase()}.</span>}
            </div>
          </fieldset>
          <div className="rounded-xl bg-stone-50 p-3"><ScheduleEditor schedule={p.schedule} /></div>
          <button className={btnPrimary}>Guardar cambios</button>
        </form>
      </Card>
    </main>
  );
}
