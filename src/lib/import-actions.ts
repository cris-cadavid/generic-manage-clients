"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { importar, leerFilas, type Entidad, type ImportResult } from "@/lib/plantillas";

export type ImportState = { ok: boolean; message: string; errores: string[] } | null;

export async function importAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Sesión expirada. Entra de nuevo.", errores: [] };
  const entidad = String(form.get("entidad")) as Entidad;
  const file = form.get("archivo") as File | null;
  if (!file || file.size === 0) return { ok: false, message: "Elige un archivo .csv, .xls o .xlsx.", errores: [] };
  if (!["servicios", "profesionales", "clientes", "productos"].includes(entidad))
    return { ok: false, message: "Entidad inválida.", errores: [] };
  const membership = await db.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } });
  if (!membership) return { ok: false, message: "Sin negocio asignado.", errores: [] };

  let filas;
  try {
    filas = leerFilas(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, message: "No pude leer el archivo. Usa la plantilla descargada.", errores: [] };
  }
  if (filas.length === 0) return { ok: false, message: "El archivo no tiene filas de datos.", errores: [] };
  if (filas.length > 2000) return { ok: false, message: "Máximo 2000 filas por importación.", errores: [] };

  let res: ImportResult;
  try {
    res = await importar(membership.orgId, entidad, filas);
  } catch {
    return { ok: false, message: "Error guardando. Revisa los datos e intenta de nuevo.", errores: [] };
  }
  const parts = [`${res.creados} creados`];
  if (res.omitidos > 0) parts.push(`${res.omitidos} ya existían`);
  return { ok: res.creados > 0, message: parts.join(" · ") + ".", errores: res.errores.slice(0, 10) };
}
