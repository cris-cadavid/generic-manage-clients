"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function switchOrg(form: FormData) {
  const orgId = String(form.get("orgId") ?? "");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const m = await db.membership.findFirst({ where: { userId: session.user.id, orgId } });
  if (!m) redirect("/dashboard");
  (await cookies()).set("orgId", orgId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}
