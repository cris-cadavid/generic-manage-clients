import { auth } from "@/auth";
import { db } from "./db";
import { redirect } from "next/navigation";

/** Devuelve { userId, orgId, role } del primer membership o redirige a onboarding. */
export async function requireTenant() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/onboarding");
  return { userId: session.user.id, orgId: membership.orgId, role: membership.role, org: membership.org };
}
