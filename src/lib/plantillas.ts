import * as XLSX from "xlsx";
import { db } from "./db";
import { DEFAULT_SCHEDULE } from "./slots";
import { normalizePhone } from "./whatsapp";

export type Entidad = "servicios" | "profesionales" | "clientes" | "productos";

export const PLANTILLAS: Record<Entidad, { titulo: string; desc: string; headers: string[]; ejemplo: (string | number)[][]; archivo: string }> = {
  servicios: {
    titulo: "Servicios",
    desc: "Lo que ofreces, con precio y duración en minutos.",
    headers: ["nombre", "precio", "duracion_min", "buffer_min"],
    ejemplo: [["Corte clásico", 25000, 30, 0], ["Corte + barba", 35000, 45, 5]],
    archivo: "plantilla_servicios.csv",
  },
  profesionales: {
    titulo: "Profesionales",
    desc: "Quienes atienden. El horario se ajusta después por barbero.",
    headers: ["nombre", "telefono"],
    ejemplo: [["Carlos", "3001112233"], ["Andrés", "3004445566"]],
    archivo: "plantilla_profesionales.csv",
  },
  clientes: {
    titulo: "Clientes",
    desc: "Tu base actual. Teléfono y correo son únicos (evitan duplicados).",
    headers: ["nombre", "telefono", "correo", "notas", "cumpleanos"],
    ejemplo: [["Juan Pérez", "3001112233", "juan@correo.com", "Degradado medio", "1990-05-14"], ["María Gómez", "3007778899", "maria@correo.com", "", ""]],
    archivo: "plantilla_clientes.csv",
  },
  productos: {
    titulo: "Productos",
    desc: "Inventario: precio de venta, costo, stock y mínimo.",
    headers: ["nombre", "categoria", "precio", "costo", "stock", "minimo"],
    ejemplo: [["Cera mate", "Peinado", 45000, 22000, 12, 3], ["Shampoo mentol", "Cuidado", 30000, 14000, 8, 2]],
    archivo: "plantilla_productos.csv",
  },
};

/** CSV de plantilla con encabezados + filas de ejemplo (se abren en Excel). */
export function plantillaCSV(e: Entidad): string {
  const t = PLANTILLAS[e];
  const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.ejemplo]);
  return XLSX.utils.sheet_to_csv(ws);
}

/** Lee .csv, .xls o .xlsx y devuelve filas como objetos {header: valor}. */
export function leerFilas(buf: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
}

const num = (v: string, def = 0): number => {
  let s = String(v ?? "").replace(/[$\s]/g, "");
  if (!s) return def;
  if (/^\d+\.\d{3}$/.test(s)) s = s.replace(".", ""); // "25.000" = miles
  s = s.replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? def : n;
};

export type ImportResult = { creados: number; omitidos: number; errores: string[] };

export async function importar(orgId: string, entidad: Entidad, filas: Record<string, string>[]): Promise<ImportResult> {
  const res: ImportResult = { creados: 0, omitidos: 0, errores: [] };
  const get = (r: Record<string, string>, ...keys: string[]): string => {
    for (const k of keys) {
      const hit = Object.keys(r).find((h) => h.trim().toLowerCase() === k);
      if (hit && String(r[hit]).trim() !== "") return String(r[hit]).trim();
    }
    return "";
  };

  if (entidad === "servicios") {
    const existentes = new Set((await db.service.findMany({ where: { orgId }, select: { name: true } })).map((s) => s.name.toLowerCase()));
    for (let i = 0; i < filas.length; i++) {
      const nombre = get(filas[i], "nombre");
      if (!nombre) { res.errores.push(`Fila ${i + 2}: sin nombre`); continue; }
      if (existentes.has(nombre.toLowerCase())) { res.omitidos++; continue; }
      await db.service.create({ data: { orgId, name: nombre, priceCents: Math.round(num(get(filas[i], "precio")) * 100), durationMin: Math.max(5, num(get(filas[i], "duracion_min", "duracion"), 30)), bufferMin: Math.max(0, num(get(filas[i], "buffer_min", "buffer"))) } });
      existentes.add(nombre.toLowerCase());
      res.creados++;
    }
  }

  if (entidad === "profesionales") {
    const existentes = new Set((await db.staff.findMany({ where: { orgId }, select: { name: true } })).map((s) => s.name.toLowerCase()));
    for (let i = 0; i < filas.length; i++) {
      const nombre = get(filas[i], "nombre");
      if (!nombre) { res.errores.push(`Fila ${i + 2}: sin nombre`); continue; }
      if (existentes.has(nombre.toLowerCase())) { res.omitidos++; continue; }
      await db.staff.create({ data: { orgId, name: nombre, phone: get(filas[i], "telefono"), schedule: DEFAULT_SCHEDULE } });
      existentes.add(nombre.toLowerCase());
      res.creados++;
    }
  }

  if (entidad === "clientes") {
    const phones = new Set((await db.customer.findMany({ where: { orgId }, select: { phone: true } })).map((c) => c.phone));
    const emails = new Set((await db.customer.findMany({ where: { orgId, NOT: { email: null } }, select: { email: true } })).map((c) => (c.email as string).toLowerCase()));
    const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    for (let i = 0; i < filas.length; i++) {
      const nombre = get(filas[i], "nombre");
      const telefono = normalizePhone(get(filas[i], "telefono"));
      const correo = get(filas[i], "correo", "email").toLowerCase() || null;
      if (!nombre || !telefono) { res.errores.push(`Fila ${i + 2}: faltan nombre o teléfono válido (10 dígitos)`); continue; }
      if (correo && !emailOk(correo)) { res.errores.push(`Fila ${i + 2}: correo no válido`); continue; }
      if (phones.has(telefono) || (correo && emails.has(correo))) { res.omitidos++; continue; }
      const cumple = get(filas[i], "cumpleanos", "cumpleaños");
      await db.customer.create({ data: { orgId, name: nombre, phone: telefono, email: correo, notes: get(filas[i], "notas"), birthdate: cumple ? new Date(cumple) : null } });
      phones.add(telefono);
      if (correo) emails.add(correo);
      res.creados++;
    }
  }

  if (entidad === "productos") {
    const existentes = new Set((await db.product.findMany({ where: { orgId }, select: { name: true } })).map((p) => p.name.toLowerCase()));
    for (let i = 0; i < filas.length; i++) {
      const nombre = get(filas[i], "nombre");
      if (!nombre) { res.errores.push(`Fila ${i + 2}: sin nombre`); continue; }
      if (existentes.has(nombre.toLowerCase())) { res.omitidos++; continue; }
      const stock = Math.max(0, num(get(filas[i], "stock")));
      const p = await db.product.create({
        data: {
          orgId, name: nombre, category: get(filas[i], "categoria") || "General",
          priceCents: Math.round(num(get(filas[i], "precio")) * 100),
          costCents: Math.round(num(get(filas[i], "costo")) * 100),
          stock, minStock: Math.max(0, num(get(filas[i], "minimo"), 5)),
        },
      });
      if (stock > 0) await db.stockMovement.create({ data: { orgId, productId: p.id, type: "ENTRADA", qty: stock, reason: "Importación inicial" } });
      existentes.add(nombre.toLowerCase());
      res.creados++;
    }
  }

  return res;
}
