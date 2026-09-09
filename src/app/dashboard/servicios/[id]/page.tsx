import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { Card, Field, inputCls, btnPrimary, ErrorBanner } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

async function save(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const price = Math.round(Number(form.get("price") ?? 0) * 100);
  const durationMin = Math.max(5, Number(form.get("durationMin") ?? 30));
  const bufferMin = Math.max(0, Number(form.get("bufferMin") ?? 0));
  if (!name) redirect(`/dashboard/servicios/${id}?err=Falta+el+nombre`);
  await db.service.updateMany({ where: { id, orgId }, data: { name, priceCents: price, durationMin, bufferMin } });
  redirect("/dashboard/servicios");
}

export default async function EditServicio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params;
  const { err } = await searchParams;
  const { orgId } = await requireTenant();
  const s = await db.service.findFirst({ where: { id, orgId }, include: { org: true } });
  if (!s) redirect("/dashboard/servicios");
  const v = VERTICALS[s.org.businessType as BusinessType];
  return (
    <main className="max-w-xl">
      <Link href="/dashboard/servicios" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"><ArrowLeft size={15} /> {v.servicePlural}</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Editar {v.serviceLabel.toLowerCase()}</h1>
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card className="mt-4">
        <form action={save} className="grid grid-cols-2 gap-4">
          <input type="hidden" name="id" value={s.id} />
          <div className="col-span-2"><Field label="Nombre"><input name="name" defaultValue={s.name} required className={inputCls} /></Field></div>
          <Field label="Precio"><input name="price" type="number" min="0" step="0.01" defaultValue={s.priceCents / 100} className={inputCls} /></Field>
          <Field label="Duración (min)"><input name="durationMin" type="number" min="5" defaultValue={s.durationMin} className={inputCls} /></Field>
          <div className="col-span-2"><Field label="Descanso entre citas (min) — evita cruces apretados"><input name="bufferMin" type="number" min="0" defaultValue={s.bufferMin} className={inputCls} /></Field></div>
          <div className="col-span-2"><button className={btnPrimary}>Guardar cambios</button></div>
        </form>
      </Card>
    </main>
  );
}
