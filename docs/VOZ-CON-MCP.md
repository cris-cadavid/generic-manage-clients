# Recepcionista de voz para tu barbería (Vapi + MCP Vuelve)

**Meta:** que un cliente **llame por teléfono** (o por web) y una voz en español
le agende una cita real en tu sistema, usando tus herramientas MCP.

**Costo de la prueba:** $0 — Vapi regala $10 en créditos sin pedir tarjeta.
Una llamada de prueba de 3 min gasta centavos.

**Cómo encaja todo:**

```text
Cliente habla → Vapi (voz ES + transcripción ES + LLM)
  → llama a tu MCP https://.../api/mcp (consultar_disponibilidad, crear_reserva…)
  → responde con voz → cita queda en tu agenda
```

---

## Paso 0 — Pon tu MCP en internet (obligatorio para probar)

Vapi vive en la nube y no ve tu `localhost`. Opción rápida y gratis:

```bash
# 1. Instala cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
# 2. Con tu app corriendo (npm run dev -- -p 3000), en otra terminal:
cloudflared tunnel --url http://localhost:3000
# 3. Copia la URL https que te da, ej: https://oreja-loca-123.trycloudflare.com
```

Tu MCP queda en `https://TU-TUNEL/api/mcp`. Déjalo corriendo durante las pruebas.
(Al desplegar en Render este paso desaparece: ya es URL pública.)

## Paso 1 — Crea tu cuenta en Vapi (5 min)

1. Entra a **https://dashboard.vapi.ai** → Sign up (con Google vale).
2. Te acreditan **$10 gratis**, sin tarjeta.
3. Guarda tu API key (la necesitarás solo si llamas por API; por dashboard no).

## Paso 2 — Crea la asistente recepcionista (10 min)

1. Dashboard → **Assistants → Create Assistant**.
2. Configura:
   - **Model**: OpenAI `gpt-4o-mini` (barato y rápido) u otro que prefieras.
   - **Language / Transcriber**: español (`es`). En Transcriber elige proveedor y pon `language: es`.
   - **Voice**: una voz en español (ej. ElevenLabs · voz ES femenina natural). Escúchala con Preview.
   - **First message**: _"¡Hola! Gracias por llamar a {tu barbería}, ¿en qué te ayudo?"_
3. **System prompt** — pega esto (ajusta el nombre):

```text
Eres la recepcionista de {NOMBRE BARBERÍA}, hablas español colombiano, amable y breve.
Tu trabajo: agendar citas por teléfono.

Flujo OBLIGATORIO para agendar:
1) Pregunta qué servicio quiere. Si no sabe, ofrece los de listar_servicios.
2) Pregunta con qué profesional (usa listar_profesionales; si no le importa, elige el que tenga hueco más pronto).
3) Pregunta qué día (formato AAAA-MM-DD; hoy es {{date}}).
4) Llama a consultar_disponibilidad y ofrece MÁXIMO 3 horarios.
5) Pide nombre completo, correo y WhatsApp (10 dígitos).
6) Llama a crear_reserva. Si falla por horario ocupado, vuelve al paso 4.
7) Confirma repitiendo: servicio, profesional, día y hora.

Reglas: nunca inventes horarios ni precios (todo sale de las herramientas).
Si preguntan precios, usa listar_servicios. Si quieren cancelar o hablar con humano,
toma sus datos con crear_cliente (notas: "quiere cancelar / hablar con humano")
y di que el barbero los contactará. Máximo 2 preguntas por turno.
```

## Paso 3 — Conecta tu MCP Vuelve (5 min)

1. En tu asistente → pestaña **Tools** → agregar herramienta tipo **MCP**.
2. Configura:
   - **Server URL**: `https://TU-TUNEL/api/mcp` (del Paso 0).
   - **Headers**: `Authorization: Bearer TU_CLAVE_VUELVE`
     (la creas en tu panel → IA conectada).
   - Protocolo: **Streamable HTTP** (por defecto).
3. Guarda/Publica. Vapi cargará tus 15 herramientas (verifícalas en la lista:
   `consultar_disponibilidad`, `crear_reserva`, `listar_servicios`…).
4. Si alguna herramienta no aparece, revisa que el túnel siga corriendo
   y que la clave sea correcta (`GET /api/mcp` debe responder JSON).

## Paso 4 — Prueba con llamada web (gratis, sin número)

1. En el dashboard de Vapi, abre tu asistente → botón **Talk / Web call**.
2. Habla como cliente con este guion:
   - *"Hola, ¿qué servicios tienen y cuánto vale el corte?"*
   - *"Quiero cita mañana con Carlos en la tarde."*
   - Da nombre + correo + WhatsApp **de prueba** (usa tu propio número).
   - Cuelga y revisa en tu panel: la cita debe estar **CONFIRMADA** en Agenda
     y el cliente creado en Clientes.
3. Repite cambiando datos: día lleno, horario ocupado, correo ya registrado —
   la asistente debe reaccionar con lo que devuelven las herramientas.

## Paso 5 (opcional) — Número de teléfono real

1. Vapi → **Phone Numbers** → consigue un número (hay números de prueba gratis
   según la doc; los dedicados cuestan ~$2/mes).
2. Asígnaselo a tu asistente → llama desde tu celular y repite el guion.
3. Cuando funcione, ese número es el que publicas en Instagram/WhatsApp.

## Alternativa: ¿y con mi cuenta de ChatGPT?

Depende de **para quién** es la voz:

**Para ti (dueño, gestionar hablando): SÍ, con matices.**
ChatGPT acepta conectores MCP personalizados (Ajustes → modo desarrollador,
plan de pago). Ahí puedes preguntar por texto *"¿quién debería volver esta
semana?"* o *"registra corte de Juan"* y usa tus herramientas. Ojo con dos
límites reales: las acciones de escritura completas están en beta sobre todo
para planes Business/Enterprise, y el **modo voz NO tiene acceso a tus
conectores personalizados** (verificado: funcionan en chat de texto, no en
voz). Truco que sí sirve: el micrófono de **dictado** (convierte tu voz en
texto del chat) — eso sí usa las herramientas porque sigue siendo el chat.

**Para tus clientes (que llamen y los atienda una voz): NO.**
ChatGPT no te da un número de teléfono que tus clientes puedan marcar.
Para eso necesitas Vapi (Pasos 1–5 de arriba) o similar: número público +
voz 24/7 conectada a tu MCP.

En resumen: ChatGPT = tú hablas con tu negocio; Vapi = tus clientes hablan
con tu negocio. Para la barbería que atiende sola, es Vapi.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| No aparecen tus herramientas | Túnel caído o URL mal | Revisa `curl https://TU-TUNEL/api/mcp` (debe dar JSON) |
| Error 401 en llamadas a tools | Header mal | `Authorization: Bearer ...` exacto, clave vigente sin revocar |
| Habla inglés | Idioma del modelo/transcriber | Pon `es` en ambos + system prompt en español |
| No entiende nombres | Transcripción | Pídele deletrear; confirma datos antes de crear |
| Crea reservas duplicadas | Reintentos de voz | La herramienta anti-doble las bloquea; revisa Agenda |
| Se demora respondiendo | Modelo pesado | Usa `gpt-4o-mini` y herramientas justas |

## Costos reales (para decidir después)

- Vapi hosting: **$0.05/min** + voz/LLM/transcripción a costo (~$0.10–0.25/min total).
- Una barbería con 20 llamadas de 3 min/mes ≈ **$6–15/mes**.
- Tu MCP y WhatsApp wa.me siguen en **$0**.

Cuando me confirmes que la llamada web funciona, seguimos con: número real,
recordatorios por llamada (campaña a "deberían volver") y despliegue en Render
para no depender del túnel.
