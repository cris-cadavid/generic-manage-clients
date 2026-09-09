import { requireTenant } from "@/lib/tenant";
import { PageHeader, Card } from "@/components/ui";
import CopyLink from "@/components/copy-link";
import { TerminalSquare, MessageSquareText, PhoneCall, TriangleAlert } from "lucide-react";
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

const VOZ_PROMPT = `Eres la recepcionista de {NOMBRE NEGOCIO}, hablas español colombiano, amable y breve.
REGLA DE ORO: solo sabes lo que devuelven tus herramientas. PROHIBIDO inventar
servicios, profesionales, precios u horarios. Si una herramienta falla o devuelve
vacío, dilo y ofrece alternativas. NUNCA digas "listo/agendado" sin que la
herramienta crear_reserva haya respondido éxito.

Al iniciar CADA llamada, primero llama a contexto_fecha y a negocio_resumen.
Resuelve fechas así: "mañana" = el día siguiente a hoy según contexto_fecha.
Si el cliente dice una fecha que ya pasó, avísale y pide otra.

Flujo OBLIGATORIO para agendar:
1) Llama a listar_servicios y ofrece SOLO esos.
2) Llama a listar_profesionales y ofrece SOLO esos. Si no le importa, elige el de hueco más pronto.
3) Pide el día y resuélvelo con contexto_fecha (formato AAAA-MM-DD).
4) Llama a consultar_disponibilidad y ofrece MÁXIMO 3 horarios de la lista.
   Si la lista viene vacía, di que ese día está lleno y ofrece otro día.
5) Pide nombre completo, correo y WhatsApp con este protocolo (la voz confunde números):
   teléfono POR GRUPOS, repite la secuencia y que confirme con "sí" (10 dígitos
   empezando por 3). Correo deletreado. Si la herramienta rechaza el teléfono,
   pídelo de nuevo despacio. NUNCA reserves con datos dudosos.
6) Llama a crear_reserva. Si falla, lee el error y corrige.
7) Solo entonces confirma repitiendo: servicio, profesional, día y hora.

Si falta algún dato, registra al cliente con crear_cliente (notas: qué pedía)
y di que lo contactarán. Máximo 2 preguntas por turno.`;

const VOZ_TOOLS = "contexto_fecha, negocio_resumen, listar_servicios, listar_profesionales, consultar_disponibilidad, crear_reserva, crear_cliente";

export default async function ConectarPage() {
  await requireTenant();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const mcpUrl = `${appUrl}/api/mcp`;
  const claudeCode = `claude mcp add vuelve --transport http ${mcpUrl} --header "Authorization: Bearer TU_CLAVE"`;
  const desktop = JSON.stringify({ mcpServers: { vuelve: { url: mcpUrl, headers: { Authorization: "Bearer TU_CLAVE" } } } }, null, 2);
  return (
    <main>
      <PageHeader title="Conectar tu IA" sub="Montaje conversacional, ChatGPT/Claude y recepcionista de voz." />
      <Card>
        <p className="flex items-center gap-2 font-bold"><TerminalSquare size={17} /> Opción A · Claude Code (montaje)</p>
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
        <p className="mt-1 text-sm text-stone-500">Con plan Plus/Pro: crea un conector MCP (modo desarrollador) apuntando a <code>{mcpUrl}</code> con header <code>Authorization: Bearer TU_CLAVE</code>. Sirve para gestionar por chat; el modo voz no tiene acceso a conectores.</p>
      </Card>

      <Card className="mt-4 border-amber-200 bg-gradient-to-r from-amber-50 to-white">
        <p className="flex items-center gap-2 font-bold"><PhoneCall size={17} /> Opción D · Recepcionista de voz con Vapi (tus clientes llaman)</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-stone-600">
          <li>
            <strong>Expón tu MCP a internet.</strong> Vapi vive en la nube y no ve tu computador.
            En pruebas: <code className="rounded bg-stone-100 px-1 font-mono text-xs">cloudflared tunnel --url http://localhost:3000</code> y
            usa la URL que te da + <code className="font-mono text-xs">/api/mcp</code>.
            En producción (Render) ya es pública y este paso sobra.
          </li>
          <li>
            <strong>Cuenta en Vapi</strong> (<code className="font-mono text-xs">dashboard.vapi.ai</code>, $10 gratis sin tarjeta)
            → Assistants → Create Assistant: modelo <code className="font-mono text-xs">gpt-4o-mini</code>,
            transcriptor en <code className="font-mono text-xs">es</code>, voz en español.
          </li>
          <li>
            <strong>Conecta tu MCP:</strong> pestaña Tools → herramienta MCP con
            Server URL <code className="break-all font-mono text-xs">{mcpUrl}</code> y header
            <code className="font-mono text-xs"> Authorization: Bearer TU_CLAVE</code> (la de <Link href="/dashboard/api" className="underline">IA conectada</Link>).
            Adjunta <strong>solo estas 7</strong>: <code className="font-mono text-xs">{VOZ_TOOLS}</code>.
          </li>
          <li>
            <strong>Pega el prompt de voz</strong> (reemplaza el nombre) y guarda:
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs">{VOZ_PROMPT}</pre>
            <div className="mt-2"><CopyLink text={VOZ_PROMPT} /></div>
          </li>
          <li>
            <strong>Prueba con llamada web</strong> (gratis, sin número): pide cita, da tus datos,
            cuelga y verifica en Agenda que quedó CONFIRMADA.
          </li>
          <li><strong>Número real (opcional):</strong> Vapi → Phone Numbers → asígnalo a la asistente y publícalo.</li>
        </ol>
        <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-stone-600">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
          Las voces a veces inventan datos: el prompt prohíbe confirmar sin éxito de la herramienta,
          y el sistema rechaza teléfonos inválidos y normaliza a formato internacional para WhatsApp.
        </p>
      </Card>
    </main>
  );
}
