import { requireTenant } from "@/lib/tenant";
import { PageHeader, Card } from "@/components/ui";
import CopyLink from "@/components/copy-link";
import { TerminalSquare, MessageSquareText } from "lucide-react";
import Link from "next/link";

const PROMPT = `Actúa como mi asistente de configuración de Vuelve (mi sistema de gestión).
Primero llama a negocio_resumen para ver qué ya existe y adapta tus palabras a mi tipo de negocio.
Luego, POR ESTE ORDEN y preguntando de a pocos:
1) Nombre de mis servicios con precio y duración -> créalos con crear_servicio.
2) Nombre de mis profesionales y su horario semanal -> créalos y usa definir_horario.
3) Mis clientes (nombre, teléfono, correo) -> crear_cliente.
4) Mis productos de inventario -> crear_producto.
Reglas: confirma cada dato raro antes de crear (precios en pesos colombianos), nunca inventes datos,
nunca crees reservas ni ventas sin pedírmelo explícito, y al final dame resumen_panel.`;

export default async function ConectarPage() {
  await requireTenant();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const mcpUrl = `${appUrl}/api/mcp`;
  const claudeCode = `claude mcp add vuelve --transport http ${mcpUrl} --header "Authorization: Bearer TU_CLAVE"`;
  const desktop = JSON.stringify({ mcpServers: { vuelve: { url: mcpUrl, headers: { Authorization: "Bearer TU_CLAVE" } } } }, null, 2);
  return (
    <main>
      <PageHeader title="Conectar tu IA" sub="Claude o ChatGPT montan tu negocio conversando contigo." />
      <Card>
        <p className="flex items-center gap-2 font-bold"><TerminalSquare size={17} /> Opción A · Claude Code (recomendado)</p>
        <code className="mt-2 block break-all rounded-xl bg-stone-950 px-3 py-2 font-mono text-xs text-amber-300">{claudeCode}</code>
        <p className="mt-1 text-xs text-stone-500">Reemplaza TU_CLAVE por la de <Link href="/dashboard/api" className="underline">IA conectada</Link>. Luego dile: <em>"Ayúdame a montar mi negocio en Vuelve"</em>.</p>
      </Card>
      <Card className="mt-4">
        <p className="flex items-center gap-2 font-bold"><TerminalSquare size={17} /> Opción B · Claude Desktop</p>
        <p className="mt-1 text-sm text-stone-500">Archivo de configuración → sección <code>mcpServers</code>:</p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-stone-950 p-3 font-mono text-xs text-amber-300">{desktop}</pre>
      </Card>
      <Card className="mt-4">
        <p className="flex items-center gap-2 font-bold"><MessageSquareText size={17} /> Prompt de montaje (pégalo en el chat)</p>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm">{PROMPT}</pre>
        <div className="mt-2"><CopyLink text={PROMPT} /></div>
      </Card>
      <Card className="mt-4">
        <p className="font-bold">Opción C · ChatGPT</p>
        <p className="mt-1 text-sm text-stone-500">Con plan Plus/Pro: crea un conector MCP (modo desarrollador) apuntando a <code>{mcpUrl}</code> con header <code>Authorization: Bearer TU_CLAVE</code>, pega el prompt de arriba y conversa.</p>
      </Card>
    </main>
  );
}
