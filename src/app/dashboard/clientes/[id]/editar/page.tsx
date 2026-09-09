import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/whatsapp";
import { Card, Field, inputCls, btnPrimary, ErrorBanner } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

async function save(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const email = String(form.get("email") ?? "").toLowerCase().trim() || null;
  const notes = String(form.get("notes") ?? "");
  const birthdate = String(form.get("birthdate") ?? "");
  if (!name || !phone) redirect(`/dashboard/clientes/${id}/editar?err=Teléfono+inválido:+usa+10+dígitos`);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/dashboard/clientes/${id}/editar?err=Correo+no+válido`);
  try {
    await db.customer.updateMany({ where: { id, orgId }, data: { name, phone, email, notes, birthdate: birthdate ? new Date(birthdate) : null } });
  } catch {
    redirect(`/dashboard/clientes/${id}/editar?err=Ese+teléfono+o+correo+ya+está+registrado`);
  }
  redirect(`/dashboard/clientes/${id}`);
}

export default async function EditCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params;
  const { err } = await searchParams;
  const { orgId } = await requireTenant();
  const c = await db.customer.findFirst({ where: { id, orgId } });
  if (!c) redirect("/dashboard/clientes");
  return (
    <main className="max-w-xl">
      <Link href={`/dashboard/clientes/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"><ArrowLeft size={15} /> Volver a la ficha</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Editar cliente</h1>
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card className="mt-4">
        <form action={save} className="grid grid-cols-2 gap-4">
          <input type="hidden" name="id" value={c.id} />
          <Field label="Nombre"><input name="name" defaultValue={c.name} required className={inputCls} /></Field>
          <Field label="WhatsApp"><input name="phone" defaultValue={c.phone} required className={inputCls} /></Field>
          <Field label="Correo"><input name="email" type="email" defaultValue={c.email ?? ""} className={inputCls} /></Field>
          <Field label="Cumpleaños (para felicitarlo 🎂)"><input name="birthdate" type="date" defaultValue={c.birthdate ? c.birthdate.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
          <div className="col-span-2"><Field label="Notas (corte favorito, alergias…)"><textarea name="notes" defaultValue={c.notes ?? ""} rows={2} className={inputCls} /></Field></div>
          <div className="col-span-2"><button className={btnPrimary}>Guardar cambios</button></div>
        </form>
      </Card>
    </main>
  );
}
