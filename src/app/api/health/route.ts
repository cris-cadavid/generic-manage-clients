export async function GET() {
  return Response.json({ ok: true, service: "generic-manage-clients", time: new Date().toISOString() });
}
