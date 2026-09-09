import { auth } from "@/auth";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PartyPopper, TriangleAlert, Clock3 } from "lucide-react";

async function accept(form: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/login");
  const token = String(form.get("token"));
  const inv = await db.invitation.findUnique({ where: { token }, include: { org: true } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) redirect(`/invite/${token}`);
  if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) redirect(`/invite/${token}`);
  const already = await db.membership.findFirst({ where: { userId: session.user.id, orgId: inv.orgId } });
  if (!already) await db.membership.create({ data: { userId: session.user.id, orgId: inv.orgId, role: inv.role } });
  await db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  redirect("/dashboard");
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invitation.findUnique({ where: { token }, include: { org: true } });
  if (!inv) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
          <TriangleAlert size={36} className="mx-auto text-red-500" />
          <h1 className="mt-3 text-xl font-bold">Invitación no válida</h1>
          <p className="mt-1 text-sm text-stone-500">El enlace no existe o fue revocado. Pide uno nuevo al dueño del negocio.</p>
        </div>
      </main>
    );
  }
  if (inv.acceptedAt || inv.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
          <Clock3 size={36} className="mx-auto text-amber-500" />
          <h1 className="mt-3 text-xl font-bold">Invitación vencida</h1>
          <p className="mt-1 text-sm text-stone-500">Ya fue usada o pasaron los 7 días. Pide un enlace nuevo.</p>
        </div>
      </main>
    );
  }

  const session = await auth();
  const v = VERTICALS[inv.org.businessType as BusinessType];
  const email = session?.user?.email?.toLowerCase();
  const mine = !!email && email === inv.email.toLowerCase();

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <p className="text-4xl">{v.icon}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Te invitaron a {inv.org.name}</h1>
        <p className="mt-1 text-sm text-stone-500">
          Como <strong>{inv.role === "OWNER" ? "dueño" : inv.role === "ADMIN" ? "administrador" : v.professionalLabel.toLowerCase()}</strong> · invitación para <strong>{inv.email}</strong>
        </p>
        {!session?.user ? (
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-sm text-stone-500">Entra o crea tu cuenta con ese correo para aceptar.</p>
            <Link href={`/login?callbackUrl=/invite/${token}`} className="rounded-xl bg-stone-900 px-4 py-2.5 font-semibold text-white">Entrar</Link>
            <Link href={`/register?callbackUrl=/invite/${token}`} className="rounded-xl bg-amber-400 px-4 py-2.5 font-bold text-stone-950">Crear cuenta</Link>
          </div>
        ) : mine ? (
          <form action={accept} className="mt-5">
            <input type="hidden" name="token" value={token} />
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-bold text-stone-950 transition hover:bg-amber-300">
              <PartyPopper size={17} /> Aceptar y entrar
            </button>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Entraste como <strong>{session.user.email}</strong>, pero esta invitación es para <strong>{inv.email}</strong>. Sal y entra con ese correo.
          </div>
        )}
      </div>
    </main>
  );
}
