# Conectar tu IA a Vuelve (MCP)

Con esto un cliente **no llena formularios**: conecta su Claude o ChatGPT a su
negocio y la IA le pregunta todo conversando (servicios, barberos, horarios,
clientes, productos) y lo registra sola con herramientas seguras.

La inteligencia la paga el cliente (su suscripción de Claude/ChatGPT).
Tu servidor solo expone herramientas por negocio: **$0 extra**.

## 1. Crear la clave (dueño del negocio)

`Panel → IA conectada → Crear clave` → cópiala (se muestra una sola vez).
Revócala cuando quieras: la IA pierde acceso al instante.

## 2. Conectar

**Claude Code** (recomendado):

```bash
claude mcp add vuelve --transport http https://TU-APP/api/mcp \
  --header "Authorization: Bearer TU_CLAVE"
```

**Claude Desktop** (`claude_desktop_config.json` → `mcpServers`):

```json
{ "mcpServers": {
  "vuelve": {
    "url": "https://TU-APP/api/mcp",
    "headers": { "Authorization": "Bearer TU_CLAVE" }
  }
} }
```

**ChatGPT** (Plus/Pro): conector MCP en modo desarrollador con la misma URL y header.

## 3. Prompt de montaje (pégalo en el chat)

> Actúa como mi asistente de configuración de Vuelve.
> Primero llama a negocio_resumen para ver qué ya existe.
> Luego, por este orden y preguntando de a pocos:
> 1) mis servicios con precio y duración,
> 2) mis profesionales y su horario semanal,
> 3) mis clientes (nombre, teléfono, correo),
> 4) mis productos de inventario.
> Confirma datos raros antes de crear, nunca inventes datos,
> nunca crees reservas ni ventas sin pedírmelo, y al final dame resumen_panel.

## Herramientas disponibles (15)

negocio_resumen · crear_servicio · listar_servicios · crear_profesional ·
listar_profesionales · definir_horario · crear_cliente · buscar_cliente ·
crear_producto · consultar_disponibilidad · crear_reserva · registrar_venta ·
candidatos_reactivar · link_whatsapp · resumen_panel

Todo queda aislado por negocio: la clave solo ve su `orgId`.
`link_whatsapp` genera enlaces wa.me (el sistema nunca envía solo).
