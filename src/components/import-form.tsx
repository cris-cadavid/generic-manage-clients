"use client";
import { useActionState } from "react";
import { importAction } from "@/lib/import-actions";
import { Upload, CheckCircle2, TriangleAlert } from "lucide-react";

export default function ImportForm({ entidad, destino }: { entidad: string; destino: string }) {
  const [state, submit, pending] = useActionState(importAction, null);
  return (
    <div>
      <form action={submit} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="entidad" value={entidad} />
        <input name="archivo" type="file" accept=".csv,.xls,.xlsx" required
          className="max-w-full text-sm file:mr-2 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-stone-50" />
        <button disabled={pending} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50">
          <Upload size={15} /> {pending ? "Importando…" : "Subir e importar"}
        </button>
      </form>
      {state && (
        <div className={`mt-2 rounded-xl px-3 py-2 text-sm ${state.ok ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-red-200 bg-red-50 text-red-700"}`}>
          <p className="flex items-center gap-1.5 font-medium">
            {state.ok ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} {state.message}{" "}
            {state.ok && <a href={destino} className="underline">Verlos</a>}
          </p>
          {state.errores.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">{state.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
