import { auth } from "@/auth";
import { db } from "./db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/** Negocio actual según cookie `orgId` (o el primero). Redirige a onboarding si no hay. */
export async function requireTenant() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) redirect("/onboarding");
  const wanted = (await cookies()).get("orgId")?.value;
  const current = memberships.find((m) => m.orgId === wanted) ?? memberships[0];
  return {
    userId: session.user.id,
    orgId: current.orgId,
    role: current.role,
    org: current.org,
    orgs: memberships.map((m) => m.org),
  };
}
