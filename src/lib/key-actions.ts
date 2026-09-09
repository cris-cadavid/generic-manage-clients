"use server";
import { db } from "@/lib/db";
import { newApiKey } from "@/lib/api-keys";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type KeyState = { key?: string; error?: string } | null;

export async function createKey(_prev: KeyState, form: FormData): Promise<KeyState> {
  const { orgId, userId, role } = await requireTenant();
  if (role !== "OWNER" && role !== "ADMIN") return { error: "Solo dueños y admins crean claves." };
  const name = String(form.get("name") ?? "Claude").trim() || "Claude";
  const k = newApiKey();
  await db.apiKey.create({ data: { orgId, userId, name, hash: k.hash, prefix: k.prefix } });
  revalidatePath("/dashboard/api");
  return { key: k.key };
}

export async function revokeKey(form: FormData) {
  "use server";
  const { orgId, role } = await requireTenant();
  if (role !== "OWNER" && role !== "ADMIN") redirect("/dashboard/api?err=Sin+permiso");
  await db.apiKey.deleteMany({ where: { id: String(form.get("id")), orgId } });
  revalidatePath("/dashboard/api");
}
