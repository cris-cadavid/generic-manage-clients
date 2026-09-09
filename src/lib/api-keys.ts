import { createHash, randomBytes } from "crypto";
import { db } from "./db";

/** Claves `vuelve_...`: se guarda solo el hash SHA-256, se muestra una vez. */
export function newApiKey(): { key: string; hash: string; prefix: string } {
  const raw = "vuelve_" + randomBytes(24).toString("base64url");
  return {
    key: raw,
    hash: createHash("sha256").update(raw).digest("hex"),
    prefix: raw.slice(0, 12) + "…",
  };
}

export async function orgFromApiKey(header: string | null): Promise<{ orgId: string; keyId: string } | null> {
  if (!header?.startsWith("Bearer ")) return null;
  const hash = createHash("sha256").update(header.slice(7).trim()).digest("hex");
  const k = await db.apiKey.findUnique({ where: { hash } });
  if (!k) return null;
  await db.apiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date() } }).catch(() => null);
  return { orgId: k.orgId, keyId: k.id };
}
