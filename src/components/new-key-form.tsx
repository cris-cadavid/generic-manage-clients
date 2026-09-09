"use client";
import { useActionState } from "react";
import { createKey } from "@/lib/key-actions";
import { KeyRound, TriangleAlert } from "lucide-react";
import CopyLink from "@/components/copy-link";

export default function NewKeyForm() {
  const [state, submit, pending] = useActionState(createKey, null);
  return (
    <div>
      <form action={submit} className="mt-3 flex flex-wrap gap-2">
        <input name="name" placeholder="Nombre (ej. Claude de recepción)" className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
        <button disabled={pending} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          <KeyRound size={15} /> {pending ? "Creando…" : "Crear clave"}
        </button>
      </form>
      {state?.error && <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><TriangleAlert size={15} /> {state.error}</p>}
      {state?.key && (
        <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">Guárdala ahora — no se muestra de nuevo:</p>
          <code className="mt-1 block break-all rounded-lg bg-white px-2 py-1.5 font-mono text-xs">{state.key}</code>
          <div className="mt-2"><CopyLink text={state.key} /></div>
        </div>
      )}
    </div>
  );
}
