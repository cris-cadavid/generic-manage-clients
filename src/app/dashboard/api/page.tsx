import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { PageHeader, Card, ErrorBanner } from "@/components/ui";
import NewKeyForm from "@/components/new-key-form";
import { revokeKey } from "@/lib/key-actions";
import { Bot, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function ApiPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { orgId } = await requireTenant();
  const { err } = await searchParams;
  const keys = await db.apiKey.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, include: { user: true } });
  return (
    <main>
      <PageHeader title="IA conectada" sub="Crea una clave, conéctala a Claude o ChatGPT y deja que la IA monte tu negocio hablando contigo." />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-white">
        <p className="flex items-center gap-2 font-semibold"><Bot size={17} /> Conectar mi asistente de IA</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
          <li>Crea una clave abajo y cópiala.</li>
          <li>Abre <Link href="/dashboard/api/conectar" className="font-medium text-stone-900 underline">la guía de conexión</Link> (2 minutos).</li>
          <li>Dile a la IA: <em>"Ayúdame a montar mi negocio en Vuelve"</em> — ella pregunta y registra todo.</li>
        </ol>
        <NewKeyForm />
      </Card>
      <Card className="mt-4">
        <p className="font-bold">Claves activas ({keys.length})</p>
        {keys.length === 0 && <p className="mt-1 text-sm text-stone-500">Aún no hay claves. Crea la primera arriba.</p>}
        <ul className="mt-2 divide-y divide-stone-100">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                <p className="font-medium">{k.name} <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">{k.prefix}</code></p>
                <p className="text-xs text-stone-400">Creada {k.createdAt.toLocaleDateString()} · último uso {k.lastUsedAt ? k.lastUsedAt.toLocaleString() : "nunca"}</p>
              </div>
              <form action={revokeKey} className="inline"><input type="hidden" name="id" value={k.id} />
                <button className="inline-flex items-center gap-1 text-sm text-red-600 underline"><Trash2 size={14} /> Revocar</button></form>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
