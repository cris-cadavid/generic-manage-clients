import { db } from "../src/lib/db";

async function main() {
  // Crea 2 orgs temporales y verifica aislamiento cruzado en las 5 tablas con orgId
  const a = await db.organization.create({ data: { slug: `iso-a-${Date.now()}`, name: "ISO A", businessType: "barber" } });
  const b = await db.organization.create({ data: { slug: `iso-b-${Date.now()}`, name: "ISO B", businessType: "cafe" } });
  const ca = await db.customer.create({ data: { orgId: a.id, name: "Solo A", phone: "3000000001" } });
  const leak: string[] = [];
  for (const model of ["customer", "staff", "service", "appointment", "sale"] as const) {
    // @ts-expect-error prueba genérica
    const rows = await db[model].findMany({ where: { orgId: b.id } });
    if (rows.some((r: { id?: string; customerId?: string }) => r.id === ca.id || r.customerId === ca.id)) leak.push(model);
  }
  // Limpieza
  await db.customer.delete({ where: { id: ca.id } });
  await db.organization.delete({ where: { id: a.id } });
  await db.organization.delete({ where: { id: b.id } });
  if (leak.length > 0) { console.error("AISLAMIENTO ROTO en:", leak.join(",")); process.exit(1); }
  console.log("Aislamiento OK: OrgB no ve datos de OrgA en customer/staff/service/appointment/sale");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
