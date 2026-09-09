import webpush from "web-push";
import { db } from "./db";

function configured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails("mailto:hola@vuelve.app", pub, priv);
    return true;
  } catch {
    return false;
  }
}

/** Envía push a todos los suscritos de una barbería. Limpia endpoints muertos (410/404). */
export async function pushToOrg(orgId: string, title: string, body: string, url = "/dashboard/agenda"): Promise<number> {
  if (!configured()) return 0;
  const subs = await db.pushSubscription.findMany({ where: { orgId } });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body, url }),
      );
      sent++;
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } });
    }
  }
  return sent;
}
