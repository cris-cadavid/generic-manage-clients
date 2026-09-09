import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { BUSINESS_TYPES } from "@/lib/verticals";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";
import { revalidatePath } from "next/cache";

async function save(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const name = String(form.get("name") ?? "").trim();
  const businessType = String(form.get("businessType") ?? "barber") as never;
  const phone = String(form.get("phone") ?? "");
  if (name) await db.organization.update({ where: { id: orgId }, data: { name, businessType, phone } });
  const reactivation = String(form.get("reactivation") ?? "");
  const reminder = String(form.get("reminder") ?? "");
  if (reactivation) await db.messageTemplate.upsert({ where: { orgId_key: { orgId, key: "reactivation" } }, update: { body: reactivation }, create: { orgId, key: "reactivation", body: reactivation } });
  if (reminder) await db.messageTemplate.upsert({ where: { orgId_key: { orgId, key: "reminder" } }, update: { body: reminder }, create: { orgId, key: "reminder", body: reminder } });
  revalidatePath("/dashboard/config");
}

export default async function ConfigPage() {
  const { orgId, org } = await requireTenant();
  const templates = await db.messageTemplate.findMany({ where: { orgId } });
  const t = (k: string) => templates.find((x) => x.key === k)?.body ?? "";
  return (
    <main>
      <PageHeader title="Ajustes" sub="Datos de tu negocio y mensajes de WhatsApp." />
      <Card className="max-w-xl">
        <form action={save} className="flex flex-col gap-4">
          <Field label="Nombre del negocio">
            <input name="name" defaultValue={org.name} className={inputCls} />
          </Field>
          <Field label="Tipo de negocio">
            <select name="businessType" defaultValue={org.businessType} className={inputCls}>
              {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </Field>
          <Field label="Teléfono del negocio">
            <input name="phone" defaultValue={org.phone ?? ""} className={inputCls} />
          </Field>
          <Field label="Mensaje de reactivación (se abre en WhatsApp)">
            <textarea name="reactivation" rows={3} defaultValue={t("reactivation")} className={inputCls} />
          </Field>
          <Field label="Mensaje de recordatorio">
            <textarea name="reminder" rows={3} defaultValue={t("reminder")} className={inputCls} />
          </Field>
          <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">Tu link público: <code className="font-semibold">/book/{org.slug}</code> — compártelo en Instagram y WhatsApp.</p>
          <button className={btnPrimary}>Guardar cambios</button>
        </form>
      </Card>
    </main>
  );
}
