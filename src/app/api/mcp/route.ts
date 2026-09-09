import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { orgFromApiKey } from "@/lib/api-keys";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import { DEFAULT_SCHEDULE, freeSlots, type Schedule } from "@/lib/slots";
import { computeReactivation, buildWaLink, reactivationMessage } from "@/lib/whatsapp";
import { money } from "@/lib/es";

export const runtime = "nodejs";

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
const fail = (msg: string) => ({ content: [{ type: "text" as const, text: msg }], isError: true as const });

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function findStaff(orgId: string, q: string) {
  const all = await db.staff.findMany({ where: { orgId, active: true } });
  const n = q.toLowerCase();
  return all.find((s) => s.name.toLowerCase() === n) ?? all.find((s) => s.name.toLowerCase().includes(n)) ?? null;
}

async function findService(orgId: string, q: string) {
  const all = await db.service.findMany({ where: { orgId, active: true } });
  const n = q.toLowerCase();
  return all.find((s) => s.name.toLowerCase() === n) ?? all.find((s) => s.name.toLowerCase().includes(n)) ?? null;
}

const DIAS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6,
};

function buildServer(orgId: string): McpServer {
  const server = new McpServer({ name: "vuelve", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.registerTool("contexto_fecha", {
    description: "Fecha de hoy y próximos 7 días con día de semana en español. LLÁMALA PRIMERO en cada llamada para resolver 'hoy', 'mañana' o fechas que diga el cliente.",
  }, async () => {
    const fmt = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 86400000);
      dias.push({ fecha: d.toISOString().slice(0, 10), dia: fmt.format(d) });
    }
    return ok({ hoy: dias[0], manana: dias[1], proximos_7_dias: dias });
  });

  server.registerTool("negocio_resumen", {
    description: "Describe el negocio conectado: tipo, etiquetas y cuántos servicios, profesionales, clientes y citas próximas tiene. Úsala primero para adaptarte.",
  }, async () => {
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) return fail("Negocio no encontrado");
    const v = VERTICALS[org.businessType as BusinessType];
    const [servicios, profesionales, clientes, citas] = await Promise.all([
      db.service.count({ where: { orgId } }),
      db.staff.count({ where: { orgId } }),
      db.customer.count({ where: { orgId } }),
      db.appointment.count({ where: { orgId, startsAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    ]);
    return ok({ negocio: org.name, tipo: org.businessType, icono: v.icon, profesional: v.professionalLabel, servicio: v.serviceLabel, servicios, profesionales, clientes, citas_proximas: citas });
  });

  server.registerTool("crear_servicio", {
    description: "Crea un servicio/producto del negocio con precio y duración.",
    inputSchema: { nombre: z.string(), precio: z.number(), duracion_min: z.number().default(30), buffer_min: z.number().default(0) },
  }, async ({ nombre, precio, duracion_min, buffer_min }) => {
    const s = await db.service.create({ data: { orgId, name: nombre.trim(), priceCents: Math.round(precio * 100), durationMin: Math.max(5, duracion_min), bufferMin: Math.max(0, buffer_min) } });
    return ok({ id: s.id, mensaje: `Servicio "${s.name}" creado: ${money(s.priceCents)}, ${s.durationMin} min` });
  });

  server.registerTool("listar_servicios", { description: "Lista los servicios activos del negocio." },
    async () => ok((await db.service.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } }))
      .map((s) => ({ nombre: s.name, precio: s.priceCents / 100, duracion_min: s.durationMin }))));

  server.registerTool("crear_profesional", {
    description: "Agrega un profesional del negocio con horario Lun–Vie 9–19 por defecto (luego ajústalo con definir_horario).",
    inputSchema: { nombre: z.string(), telefono: z.string().optional(), servicios: z.array(z.string()).optional() },
  }, async ({ nombre, telefono, servicios }) => {
    const ids: string[] = [];
    const faltantes: string[] = [];
    for (const n of servicios ?? []) {
      const s = await findService(orgId, n);
      if (s) ids.push(s.id); else faltantes.push(n);
    }
    const p = await db.staff.create({ data: { orgId, name: nombre.trim(), phone: telefono ?? "", services: ids, schedule: DEFAULT_SCHEDULE } });
    return ok({ id: p.id, mensaje: `Profesional "${p.name}" creado${faltantes.length ? `. Ojo, no encontré estos servicios: ${faltantes.join(", ")}` : ""}` });
  });

  server.registerTool("listar_profesionales", { description: "Lista los profesionales activos del negocio." },
    async () => ok((await db.staff.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } })).map((p) => ({ nombre: p.name, telefono: p.phone }))));

  server.registerTool("definir_horario", {
    description: "Define los días y horas que trabaja un profesional (eso determina los huecos de reserva). Días: lunes..domingo o 0..6.",
    inputSchema: {
      profesional: z.string(),
      horario: z.array(z.object({ dia: z.union([z.string(), z.number()]), abre: z.string(), cierra: z.string() })),
    },
  }, async ({ profesional, horario }) => {
    const p = await findStaff(orgId, profesional);
    if (!p) return fail(`No encontré al profesional "${profesional}"`);
    const days: Record<string, { open: string; close: string }> = {};
    for (const h of horario) {
      const n = typeof h.dia === "number" ? h.dia : DIAS[h.dia.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
      if (n === undefined || n < 0 || n > 6 || !/^\d{2}:\d{2}$/.test(h.abre) || !/^\d{2}:\d{2}$/.test(h.cierra))
        return fail(`Horario inválido en: ${JSON.stringify(h)}. Usa día lunes..domingo y horas HH:MM.`);
      days[String(n)] = { open: h.abre, close: h.cierra };
    }
    await db.staff.update({ where: { id: p.id }, data: { schedule: { slot: 30, days } as Schedule } });
    return ok({ mensaje: `Horario de ${p.name} actualizado: ${Object.keys(days).length} días` });
  });

  server.registerTool("crear_cliente", {
    description: "Registra un cliente. Teléfono y correo son únicos por negocio.",
    inputSchema: { nombre: z.string(), telefono: z.string(), correo: z.string().optional(), notas: z.string().optional(), cumpleanos: z.string().optional() },
  }, async ({ nombre, telefono, correo, notas, cumpleanos }) => {
    const phone = telefono.replace(/\D/g, "");
    const email = correo?.toLowerCase().trim() || null;
    if (!nombre.trim() || !phone) return fail("Faltan nombre o teléfono");
    if (email && !emailOk(email)) return fail("Correo no válido");
    try {
      const c = await db.customer.create({ data: { orgId, name: nombre.trim(), phone, email, notes: notas ?? "", birthdate: cumpleanos ? new Date(cumpleanos) : null } });
      return ok({ id: c.id, mensaje: `Cliente "${c.name}" creado` });
    } catch {
      return fail("Ese teléfono o correo ya está registrado en este negocio");
    }
  });

  server.registerTool("buscar_cliente", {
    description: "Busca clientes por nombre, teléfono o correo.",
    inputSchema: { texto: z.string() },
  }, async ({ texto }) => ok((await db.customer.findMany({
    where: { orgId, OR: [{ name: { contains: texto, mode: "insensitive" } }, { phone: { contains: texto } }, { email: { contains: texto, mode: "insensitive" } }] },
    take: 10, include: { _count: { select: { sales: true } } },
  })).map((c) => ({ nombre: c.name, telefono: c.phone, correo: c.email, visitas: c._count.sales }))));

  server.registerTool("crear_producto", {
    description: "Agrega un producto al inventario con stock inicial.",
    inputSchema: { nombre: z.string(), categoria: z.string().optional(), precio: z.number(), costo: z.number().optional(), stock: z.number().optional(), minimo: z.number().optional() },
  }, async ({ nombre, categoria, precio, costo, stock, minimo }) => {
    const p = await db.product.create({
      data: {
        orgId, name: nombre.trim(), category: categoria || "General",
        priceCents: Math.round(precio * 100), costCents: Math.round((costo ?? 0) * 100),
        stock: Math.max(0, stock ?? 0), minStock: Math.max(0, minimo ?? 5),
      },
    });
    if (p.stock > 0) await db.stockMovement.create({ data: { orgId, productId: p.id, type: "ENTRADA", qty: p.stock, reason: "Carga por IA" } });
    return ok({ id: p.id, mensaje: `Producto "${p.name}" creado con stock ${p.stock}` });
  });

  server.registerTool("consultar_disponibilidad", {
    description: "Huecos libres de un profesional para un servicio en una fecha (YYYY-MM-DD).",
    inputSchema: { profesional: z.string(), servicio: z.string(), fecha: z.string() },
  }, async ({ profesional, servicio, fecha }) => {
    const [p, s] = await Promise.all([findStaff(orgId, profesional), findService(orgId, servicio)]);
    if (!p) return fail(`No encontré al profesional "${profesional}"`);
    if (!s) return fail(`No encontré el servicio "${servicio}"`);
    const busy = await db.appointment.findMany({
      where: { orgId, staffId: p.id, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gte: new Date(`${fecha}T00:00:00`), lt: new Date(`${fecha}T23:59:59`) } },
    });
    const sched = ((p.schedule as Schedule | null)?.days ? p.schedule : DEFAULT_SCHEDULE) as Schedule;
    return ok({ profesional: p.name, servicio: s.name, fecha, huecos: freeSlots(fecha, sched, s.durationMin, s.bufferMin, busy) });
  });

  server.registerTool("crear_reserva", {
    description: "Crea una reserva. Verifica disponibilidad primero con consultar_disponibilidad. Respeta unicidad de teléfono/correo.",
    inputSchema: {
      cliente_nombre: z.string(), cliente_telefono: z.string(), cliente_correo: z.string(),
      profesional: z.string(), servicio: z.string(), fecha: z.string(), hora: z.string(),
    },
  }, async ({ cliente_nombre, cliente_telefono, cliente_correo, profesional, servicio, fecha, hora }) => {
    const phone = cliente_telefono.replace(/\D/g, "");
    const email = cliente_correo.toLowerCase().trim();
    if (!emailOk(email)) return fail("Correo del cliente no válido");
    const [p, s] = await Promise.all([findStaff(orgId, profesional), findService(orgId, servicio)]);
    if (!p) return fail(`No encontré al profesional "${profesional}"`);
    if (!s) return fail(`No encontré el servicio "${servicio}"`);
    const startsAt = new Date(`${fecha}T${hora}`);
    if (isNaN(startsAt.getTime()) || startsAt < new Date()) return fail("Fecha pasada o inválida");
    const endsAt = new Date(startsAt.getTime() + (s.durationMin + s.bufferMin) * 60000);
    const clash = await db.appointment.findFirst({
      where: { orgId, staffId: p.id, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    });
    if (clash) return fail("Ese horario se acaba de ocupar. Consulta disponibilidad de nuevo.");
    let customer = await db.customer.findFirst({ where: { orgId, phone } });
    if (customer) {
      if (!customer.email) await db.customer.update({ where: { id: customer.id }, data: { email } });
      else if (customer.email !== email) return fail("Ese teléfono ya está registrado con otro correo");
    } else {
      const byEmail = await db.customer.findFirst({ where: { orgId, email } });
      if (byEmail) return fail("Ese correo ya está registrado con otro teléfono");
      customer = await db.customer.create({ data: { orgId, name: cliente_nombre.trim(), phone, email } });
    }
    await db.appointment.create({ data: { orgId, customerId: customer.id, staffId: p.id, serviceId: s.id, startsAt, endsAt, status: "CONFIRMED" } });
    return ok({ mensaje: `Reserva creada: ${cliente_nombre} con ${p.name}, ${s.name}, ${fecha} ${hora}` });
  });

  server.registerTool("registrar_venta", {
    description: "Registra una venta/visita ya realizada. Cliente se busca por nombre, teléfono o correo.",
    inputSchema: { cliente: z.string(), servicio: z.string().optional(), profesional: z.string().optional(), valor: z.number(), fecha: z.string().optional() },
  }, async ({ cliente, servicio, profesional, valor, fecha }) => {
    const found = await db.customer.findFirst({
      where: { orgId, OR: [{ name: { contains: cliente, mode: "insensitive" } }, { phone: { contains: cliente } }, { email: { contains: cliente, mode: "insensitive" } }] },
    });
    if (!found) return fail(`No encontré al cliente "${cliente}". Créalo primero con crear_cliente.`);
    const s = servicio ? await findService(orgId, servicio) : null;
    const p = profesional ? await findStaff(orgId, profesional) : null;
    await db.sale.create({
      data: { orgId, customerId: found.id, serviceId: s?.id, staffId: p?.id, amountCents: Math.round(valor * 100), date: fecha ? new Date(fecha) : new Date() },
    });
    return ok({ mensaje: `Venta de $${valor} registrada para ${found.name}` });
  });

  server.registerTool("candidatos_reactivar", {
    description: "Clientes que deberían volver (tardan más de lo normal), con enlace de WhatsApp listo para cada uno.",
  }, async () => {
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) return fail("Negocio no encontrado");
    const [customers, sales] = await Promise.all([
      db.customer.findMany({ where: { orgId } }),
      db.sale.findMany({ where: { orgId }, orderBy: { date: "asc" }, take: 1000 }),
    ]);
    const byC = new Map<string, Date[]>();
    for (const s of sales) {
      if (!s.customerId) continue;
      if (!byC.has(s.customerId)) byC.set(s.customerId, []);
      byC.get(s.customerId)!.push(s.date);
    }
    const cById = new Map(customers.map((c) => [c.id, c]));
    const cands = computeReactivation(
      [...byC.entries()].map(([id, dates]) => ({ customerId: id, name: cById.get(id)?.name ?? "?", phone: cById.get(id)?.phone ?? "", dates })),
      org.businessType as BusinessType,
    ).slice(0, 20);
    return ok(cands.map((c) => ({
      nombre: c.name, telefono: c.phone, ultima_hace_dias: c.daysSince,
      whatsapp: buildWaLink(c.phone, reactivationMessage(c.name, org.name, c.daysSince)),
    })));
  });

  server.registerTool("link_whatsapp", {
    description: "Genera un enlace wa.me con mensaje prellenado (el sistema NO envía solo: el comerciante toca el link).",
    inputSchema: { telefono: z.string(), mensaje: z.string() },
  }, async ({ telefono, mensaje }) => ok({ link: buildWaLink(telefono, mensaje) }));

  server.registerTool("resumen_panel", {
    description: "KPIs del negocio: ingresos del mes, citas de hoy, clientes, reactivación e inactivos.",
  }, async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [customers, sales, todayCount] = await Promise.all([
      db.customer.findMany({ where: { orgId } }),
      db.sale.findMany({ where: { orgId }, orderBy: { date: "asc" }, take: 1000 }),
      db.appointment.count({ where: { orgId, startsAt: { gte: today, lt: new Date(today.getTime() + 86400000) }, status: { not: "CANCELLED" } } }),
    ]);
    const monthTotal = sales.filter((s) => s.date >= monthStart).reduce((a, s) => a + s.amountCents, 0);
    const byC = new Map<string, Date[]>();
    for (const s of sales) {
      if (!s.customerId) continue;
      if (!byC.has(s.customerId)) byC.set(s.customerId, []);
      byC.get(s.customerId)!.push(s.date);
    }
    const cById = new Map(customers.map((c) => [c.id, c]));
    const org = await db.organization.findUnique({ where: { id: orgId } });
    const cands = computeReactivation(
      [...byC.entries()].map(([id, dates]) => ({ customerId: id, name: cById.get(id)?.name ?? "?", phone: cById.get(id)?.phone ?? "", dates })),
      (org?.businessType ?? "other") as BusinessType,
    );
    return ok({ ingresos_mes: monthTotal / 100, citas_hoy: todayCount, clientes: customers.length, deberian_volver: cands.length });
  });

  return server;
}

export async function POST(req: Request): Promise<Response> {
  const authz = await orgFromApiKey(req.headers.get("authorization"));
  if (!authz) {
    return Response.json({ error: "unauthorized: usa Authorization: Bearer <tu-clave-vuelve>" }, { status: 401 });
  }
  try {
    const raw = await req.text();
    let body: unknown = undefined;
    try {
      body = raw ? JSON.parse(raw) : undefined;
      const msg = body as { method?: string; params?: { name?: string; arguments?: unknown } };
      if (msg?.method === "tools/call") {
        console.log(`[MCP ${authz.orgId.slice(0, 8)}] tool=${msg.params?.name} args=${JSON.stringify(msg.params?.arguments)?.slice(0, 300)}`);
      } else {
        console.log(`[MCP ${authz.orgId.slice(0, 8)}] ${msg?.method ?? "?"}`);
      }
    } catch { /* body no-JSON: sigue igual */ }
    const server = buildServer(authz.orgId);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    const forward = new Request(req.url, { method: "POST", headers: req.headers, body: raw || undefined });
    const res = await transport.handleRequest(forward);
    try {
      const text = await res.clone().text();
      console.log(`[MCP ${authz.orgId.slice(0, 8)}] <- ${text.slice(0, 300)}`);
    } catch { /* noop */ }
    return res;
  } catch (e) {
    console.error("MCP error:", e);
    return Response.json({ error: "mcp error" }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ mcp: "vuelve", endpoint: "/api/mcp (POST, Streamable HTTP)", auth: "Bearer <clave>" });
}
