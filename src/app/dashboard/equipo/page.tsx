import { requireTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { PageHeader, Card, Badge, ErrorBanner, inputCls, btnPrimary } from "@/components/ui";
import CopyLink from "@/components/copy-link";
import { UsersRound, UserPlus, MailOpen } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

async function mustManage() {
  const { orgId, role, userId } = await requireTenant();
  if (role !== "OWNER" && role !== "ADMIN") redirect("/dashboard/equipo?err=Solo+dueños+y+admins+pueden+gestionar+el+equipo");
  return { orgId, role, userId };
}

async function setRole(form: FormData) {
  "use server";
  const { orgId, role: myRole } = await mustManage();
  const id = String(form.get("id"));
  const role = String(form.get("role")) as "OWNER" | "ADMIN" | "STAFF";
  const target = await db.membership.findFirst({ where: { id, orgId } });
  if (!target) return;
  if (target.role === "OWNER" && myRole !== "OWNER") redirect("/dashboard/equipo?err=Solo+un+dueño+puede+cambiar+a+otro+dueño");
  if ((target.role === "OWNER" || role === "OWNER") && myRole !== "OWNER")
    redirect("/dashboard/equipo?err=Solo+un+dueño+puede+asignar+ese+rol");
  const owners = await db.membership.count({ where: { orgId, role: "OWNER" } });
  if (target.role === "OWNER" && role !== "OWNER" && owners <= 1)
    redirect("/dashboard/equipo?err=Debe+haber+al+menos+un+dueño");
  await db.membership.updateMany({ where: { id, orgId }, data: { role } });
  revalidatePath("/dashboard/equipo");
}

async function remove(form: FormData) {
  "use server";
  const { orgId, role: myRole, userId } = await mustManage();
  const id = String(form.get("id"));
  const target = await db.membership.findFirst({ where: { id, orgId } });
  if (!target || target.userId === userId) redirect("/dashboard/equipo?err=No+puedes+eliminarte+a+ti+mismo");
  if (target.role === "OWNER" && myRole !== "OWNER") redirect("/dashboard/equipo?err=Solo+un+dueño+puede+quitar+a+otro+dueño");
  if (target.role === "OWNER") {
    const owners = await db.membership.count({ where: { orgId, role: "OWNER" } });
    if (owners <= 1) redirect("/dashboard/equipo?err=Debe+haber+al+menos+un+dueño");
  }
  await db.membership.deleteMany({ where: { id, orgId } });
  revalidatePath("/dashboard/equipo");
}

async function invite(form: FormData) {
  "use server";
  const { orgId } = await mustManage();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const role = String(form.get("role") ?? "STAFF") as "OWNER" | "ADMIN" | "STAFF";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/dashboard/equipo?err=Correo+no+válido");
  const existingUser = await db.user.findUnique({ where: { email }, include: { memberships: { where: { orgId } } } });
  if (existingUser && existingUser.memberships.length > 0) redirect("/dashboard/equipo?err=Esa+persona+ya+es+miembro");
  const pending = await db.invitation.findFirst({ where: { orgId, email, acceptedAt: null, expiresAt: { gt: new Date() } } });
  if (pending) redirect("/dashboard/equipo?err=Ya+hay+una+invitación+pendiente+para+ese+correo");
  await db.invitation.create({
    data: { orgId, email, role, token: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  revalidatePath("/dashboard/equipo");
}

async function revoke(form: FormData) {
  "use server";
  const { orgId } = await mustManage();
  await db.invitation.deleteMany({ where: { id: String(form.get("id")), orgId } });
  revalidatePath("/dashboard/equipo");
}

const ROLE_BADGE = { OWNER: "orange", ADMIN: "blue", STAFF: "zinc" } as const;

export default async function EquipoPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { orgId, org, role: myRole } = await requireTenant();
  const session = await auth();
  const v = VERTICALS[org.businessType as BusinessType];
  const { err } = await searchParams;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [members, pending] = await Promise.all([
    db.membership.findMany({ where: { orgId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invitation.findMany({ where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  const ROLE_ES: Record<string, string> = { OWNER: "Dueño", ADMIN: "Administrador", STAFF: v.professionalLabel };
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return (
    <main>
      <PageHeader title="Equipo" sub={`Dueño: todo · Administrador: opera · ${v.professionalLabel}: agenda y ventas.`} />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}

      {canManage && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-white">
          <p className="flex items-center gap-2 font-semibold"><UserPlus size={17} /> Agregar miembro</p>
          <p className="mt-1 text-sm text-stone-500">Escríbele el correo, comparte el enlace y al aceptar entra con el rol elegido. Vale 7 días.</p>
          <form action={invite} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input name="email" type="email" required placeholder="correo@ejemplo.com" className={`${inputCls} sm:col-span-2`} />
            <select name="role" className={inputCls} defaultValue="STAFF">
              {myRole === "OWNER" && <option value="OWNER">Dueño</option>}
              <option value="ADMIN">Administrador</option>
              <option value="STAFF">{v.professionalLabel}</option>
            </select>
            <button className={btnPrimary}>Invitar</button>
          </form>
        </Card>
      )}

      {canManage && pending.length > 0 && (
        <Card className="mt-4">
          <p className="flex items-center gap-2 font-bold"><MailOpen size={17} /> Invitaciones pendientes ({pending.length})</p>
          <ul className="mt-2 divide-y divide-stone-100">
            {pending.map((inv) => {
              const link = `${appUrl}/invite/${inv.token}`;
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{inv.email} <Badge color={ROLE_BADGE[inv.role]}>{ROLE_ES[inv.role]}</Badge></p>
                    <p className="text-xs text-stone-400">Vence {inv.expiresAt.toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="hidden max-w-64 truncate rounded-lg bg-stone-100 px-2 py-1 text-xs md:block">{link}</code>
                    <CopyLink text={link} />
                    <form action={revoke} className="inline"><input type="hidden" name="id" value={inv.id} />
                      <button className="text-sm text-red-600 underline">Revocar</button></form>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-stone-100 p-2 text-stone-500"><UsersRound size={17} /></span>
                <div>
                  <p className="font-semibold">{m.user.name ?? m.user.email}{session?.user?.id === m.userId ? " (tú)" : ""}</p>
                  <p className="text-sm text-stone-500">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge color={ROLE_BADGE[m.role]}>{ROLE_ES[m.role]}</Badge>
                {canManage && (
                  <>
                    <form action={setRole} className="inline-flex gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <select name="role" defaultValue={m.role} className="rounded-lg border border-stone-300 px-1.5 py-1">
                        {myRole === "OWNER" && <option value="OWNER">Dueño</option>}
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">{v.professionalLabel}</option>
                      </select>
                      <button className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-medium text-white">OK</button>
                    </form>
                    <form action={remove} className="inline"><input type="hidden" name="id" value={m.id} />
                      <button className="text-sm text-red-600 underline">Quitar</button></form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
