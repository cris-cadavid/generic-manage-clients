import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/verticals";
import { redirect } from "next/navigation";

async function createOrg(form: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const name = String(form.get("name") ?? "Mi negocio").trim();
  const businessType = (String(form.get("businessType") ?? "barber") || "barber") as BusinessType;
  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Date.now().toString(36);
  const org = await db.organization.create({ data: { slug, name, businessType } });
  await db.membership.create({ data: { userId: session.user.id, orgId: org.id, role: "OWNER" } });
  await db.messageTemplate.create({ data: { orgId: org.id, key: "reactivation", body: "Hola {{nombre}} 👋 Soy {{negocio}}. Hace {{dias}} días que no te vemos. ¿Te agendo?" } });
  await db.messageTemplate.create({ data: { orgId: org.id, key: "reminder", body: "Hola {{nombre}} 👋 Te esperamos en {{negocio}}: {{fecha}}. Confirma con un OK." } });
  redirect("/dashboard");
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-3xl">👋</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">¿Cómo se llama tu negocio?</h1>
        <p className="text-sm text-stone-500">El sistema se adapta a tu tipo de negocio.</p>
        <form action={createOrg} className="mt-5 flex flex-col gap-4">
          <input name="name" required placeholder="Ej. Barbería El Corte Fino" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BUSINESS_TYPES.map((t, i) => (
              <label key={t.value} className="cursor-pointer rounded-2xl border border-stone-200 p-3 text-sm transition has-checked:border-amber-500 has-checked:bg-amber-50">
                <input type="radio" name="businessType" value={t.value} defaultChecked={i === 0} className="accent-amber-500" />
                <span className="mt-1 block font-semibold">{t.label}</span>
                <span className="text-xs text-stone-500">{t.desc}</span>
              </label>
            ))}
          </div>
          <button className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-stone-950 transition hover:bg-amber-300">Abrir mi negocio →</button>
        </form>
      </div>
    </main>
  );
}
