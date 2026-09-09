import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "demo@generic.local";
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo", passwordHash },
  });
  const org = await prisma.organization.upsert({
    where: { slug: "barberia-demo" },
    update: {},
    create: { slug: "barberia-demo", name: "Barbería Demo", businessType: "barber", phone: "3000000000" },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: "OWNER" },
  });
  const corte = await prisma.service.upsert({
    where: { id: "seed-corte" },
    update: {},
    create: { id: "seed-corte", orgId: org.id, name: "Corte clásico", priceCents: 25000_00 / 100, durationMin: 30, active: true },
  });
  const carlos = await prisma.staff.upsert({
    where: { id: "seed-carlos" },
    update: {},
    create: {
      id: "seed-carlos", orgId: org.id, name: "Carlos", services: [corte.id],
      schedule: { slot: 30, days: { "1": { open: "09:00", close: "19:00" }, "2": { open: "09:00", close: "19:00" }, "3": { open: "09:00", close: "19:00" }, "4": { open: "09:00", close: "19:00" }, "5": { open: "09:00", close: "19:00" }, "6": { open: "09:00", close: "14:00" } } },
    },
  });
  const juan = await prisma.customer.upsert({
    where: { id: "seed-juan" },
    update: {},
    create: { id: "seed-juan", orgId: org.id, name: "Juan", phone: "573001112233" },
  });
  // 3 visitas hace 60/40/29 días → frecuencia ~15d, debería volver
  for (const daysAgo of [60, 40, 29]) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    await prisma.sale.create({
      data: { orgId: org.id, customerId: juan.id, staffId: carlos.id, serviceId: corte.id, amountCents: 25000, date: d },
    });
  }
  await prisma.messageTemplate.upsert({
    where: { orgId_key: { orgId: org.id, key: "reactivation" } },
    update: {},
    create: { orgId: org.id, key: "reactivation", body: "Hola {{nombre}} 👋 Soy {{negocio}}. Hace {{dias}} días que no te vemos. ¿Reservamos?" },
  });
  console.log("Seed OK:", { email, pass: "demo1234", org: org.slug });
}

main().finally(() => pool.end());
