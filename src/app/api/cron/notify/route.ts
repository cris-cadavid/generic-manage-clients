import { db } from "@/lib/db";
import { pushToOrg } from "@/lib/push";

/** Llamar cada 15min desde cron-job.org con header Authorization: Bearer CRON_SECRET.
 *  Envía push por barbería con el resumen de citas de las próximas 24h. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const now = new Date();
  const upcoming = await db.appointment.findMany({
    where: { startsAt: { gte: now, lt: new Date(now.getTime() + 24 * 3600 * 1000) }, status: { in: ["PENDING", "CONFIRMED"] } },
    include: { customer: true, org: true },
  });
  const byOrg = new Map<string, typeof upcoming>();
  for (const a of upcoming) {
    if (!byOrg.has(a.orgId)) byOrg.set(a.orgId, []);
    byOrg.get(a.orgId)!.push(a);
  }
  let pushed = 0;
  for (const [orgId, list] of byOrg) {
    const names = list.slice(0, 3).map((a) => `${a.customer.name} ${a.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`).join(" · ");
    pushed += await pushToOrg(orgId, `📅 ${list.length} ${list.length === 1 ? "cita próxima" : "citas próximas"}`, names, "/dashboard/agenda");
  }
  return Response.json({ ok: true, upcoming24h: upcoming.length, orgsNotified: byOrg.size, pushed });
}
