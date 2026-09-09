import { PLANTILLAS, plantillaCSV, type Entidad } from "@/lib/plantillas";

export async function GET(_req: Request, { params }: { params: Promise<{ entidad: string }> }) {
  const { entidad } = await params;
  if (!(entidad in PLANTILLAS)) return Response.json({ error: "entidad inválida" }, { status: 404 });
  const csv = "﻿" + plantillaCSV(entidad as Entidad); // BOM para que Excel muestre tildes
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${PLANTILLAS[entidad as Entidad].archivo}"`,
    },
  });
}
