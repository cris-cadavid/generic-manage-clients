"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyLink({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1 text-sm font-medium transition hover:bg-stone-50">
      {ok ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {ok ? "¡Copiado!" : "Copiar enlace"}
    </button>
  );
}
