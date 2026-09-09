import { requireTenant } from "@/lib/tenant";
import { PLANTILLAS, type Entidad } from "@/lib/plantillas";
import { PageHeader, Card } from "@/components/ui";
import ImportForm from "@/components/import-form";
import { Download, FileSpreadsheet, ListOrdered } from "lucide-react";
import Link from "next/link";

const DESTINO: Record<Entidad, string> = {
  servicios: "/dashboard/servicios",
  profesionales: "/dashboard/staff",
  clientes: "/dashboard/clientes",
  productos: "/dashboard/inventario",
};

export default async function ImportarPage() {
  await requireTenant();
  return (
    <main>
      <PageHeader title="Importar datos" sub="Descarga la plantilla, llénala en Excel y súbela. Así no empiezas de ceros." />
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(PLANTILLAS) as Entidad[]).map((key) => {
          const t = PLANTILLAS[key];
          return (
            <Card key={key}>
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><FileSpreadsheet size={20} /></span>
                <div>
                  <p className="font-bold">{t.titulo}</p>
                  <p className="text-sm text-stone-500">{t.desc}</p>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-500">
                <ListOrdered size={14} className="mt-0.5 shrink-0" />
                Columnas: {t.headers.join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/api/plantillas/${key}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-50">
                  <Download size={15} /> Descargar plantilla
                </a>
                <Link href={DESTINO[key]} className="inline-flex items-center rounded-xl px-3 py-2 text-sm text-stone-500 underline">
                  Ver {t.titulo.toLowerCase()}
                </Link>
              </div>
              <div className="mt-2 border-t border-stone-100 pt-2">
                <ImportForm entidad={key} destino={DESTINO[key]} />
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="mt-4 bg-amber-50/60">
        <p className="text-sm text-stone-600">
          💡 <strong>Consejo:</strong> las filas de ejemplo vienen en la plantilla — bórralas o déjalas, el sistema omite lo que ya existe (clientes por teléfono, lo demás por nombre). Acepta <strong>.csv, .xls y .xlsx</strong>, máximo 2000 filas.
        </p>
      </Card>
    </main>
  );
}
