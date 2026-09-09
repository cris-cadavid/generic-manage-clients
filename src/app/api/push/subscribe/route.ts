import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { orgId, subscription } = await req.json();
  if (!orgId || !subscription?.endpoint) return Response.json({ error: "bad request" }, { status: 400 });
  const member = await db.membership.findFirst({ where: { userId: session.user.id, orgId } });
  if (!member) return Response.json({ error: "forbidden" }, { status: 403 });
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { orgId, userId: session.user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: { orgId, userId: session.user.id, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint } = await req.json();
  if (!endpoint) return Response.json({ error: "bad request" }, { status: 400 });
  const sub = await db.pushSubscription.findUnique({ where: { endpoint } });
  if (sub?.userId !== session.user.id) return Response.json({ error: "forbidden" }, { status: 403 });
  await db.pushSubscription.delete({ where: { endpoint } });
  return Response.json({ ok: true });
}
