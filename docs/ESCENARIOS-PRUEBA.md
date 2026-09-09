# Escenarios de prueba manual — Barbería (Vuelve)

Guía para validar el sistema completo como si fueras una barbería real.
Marca cada caso ✅ / ❌ a medida que lo pruebas.

## 0. Preparación (5 min)

- [ ] App corriendo en `http://localhost:3000` (`npm run dev`).
- [ ] Base Neon migrada y con seed: `npx prisma migrate deploy && npm run db:seed`.
- [ ] Cuenta demo: `demo@generic.local` / `demo1234` → negocio **Barbería Demo** (slug `barberia-demo`, con Juan como candidato a reactivación).
- [ ] Para probar equipo/invitaciones necesitas **2 correos** (ej. tu Gmail + un alias `tunombre+barbero@gmail.com`) y **2 navegadores** (normal + incógnito).
- [ ] Para push: usa **Chrome o Edge en escritorio** (o Android). En iPhone el push solo llega si instalas la app como PWA (Compartir → Añadir a pantalla de inicio).
- [ ] Para WhatsApp: ten a la mano **tu propio número** para usarlo como cliente de prueba (los botones abren `wa.me`, no envían nada solos).

---

## 1. Cuentas y acceso

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 1.1 | Registro con correo | `/register` → nombre + correo + clave (6+) | Redirige a login |
| 1.2 | Registro duplicado | Registra el mismo correo otra vez | No rompe, redirige a login |
| 1.3 | Login correcto | `demo@generic.local` / `demo1234` | Entra al dashboard |
| 1.4 | Login incorrecto | Clave mala | Mensaje "Correo o contraseña incorrectos" |
| 1.5 | Login con Google | Botón Google (si configuraste OAuth) | Entra sin contraseña |
| 1.6 | Ruta protegida | Sin login abre `/dashboard/agenda` | Redirige a `/login` |
| 1.7 | Cerrar sesión | Botón "Cerrar sesión" del sidebar (o icono en móvil) | Vuelve a `/login`; `/dashboard` ya no abre |
| 1.8 | Onboarding | Con cuenta nueva → crear "Barbería El Faro" tipo Barbería | Entra al dashboard con guía de 4 pasos |

## 2. Equipo e invitaciones

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 2.1 | Invitar barbero | Equipo → correo del 2.º correo + rol Profesional → Invitar | Aparece en "pendientes" con link + Copiar |
| 2.2 | Copiar enlace | Botón "Copiar enlace" | Cambia a "¡Copiado!" |
| 2.3 | Aceptar invitación | Incógnito → pegar link → crear cuenta con ESE correo → "Aceptar y entrar" | Entra al dashboard del negocio |
| 2.4 | Invitación con correo distinto | Incógnito logueado con otro correo abre el link | Aviso "esta invitación es para X" |
| 2.5 | Link inválido | `/invite/fake123` | "Invitación no válida" |
| 2.6 | Revocar | Dueño → Revocar en pendiente | El link deja de servir ("no válida") |
| 2.7 | Cambiar rol | Dueño cambia Profesional → Administrador | Badge cambia; el usuario ve controles de equipo |
| 2.8 | STAFF no gestiona | Entra como Profesional → Equipo | Ve la lista pero SIN formularios ni botones OK/Quitar |
| 2.9 | Proteger último dueño | Intentar degradar/quitar al único Dueño | Mensaje "Debe haber al menos un dueño" |
| 2.10 | No auto-eliminarse | Intentar quitarte a ti mismo | "No puedes eliminarte a ti mismo" |

## 3. Servicios y barberos

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 3.1 | Crear servicio | Servicios → "Degradado" 25000, 30 min | Aparece en la lista |
| 3.2 | Editar + buffer | Editar → precio 28000, buffer 5 | Se guarda; el buffer separa citas |
| 3.3 | Desactivar | Desactivar un servicio | No sale en agenda ni reserva pública |
| 3.4 | Eliminar con reservas activas | Eliminar servicio con cita PENDIENTE/CONFIRMADA | Se bloquea con aviso |
| 3.5 | Crear barbero | Barberos → nombre + teléfono + servicio | Aparece con horario Lun–Vie 9–19 por defecto |
| 3.6 | Horario por barbero | Editar → desmarcar domingo, sábado 9–14 | La reserva pública solo ofrece esos días |
| 3.7 | Multi-servicios | Editar → marcar 2 servicios | Se muestran en su ficha |

## 4. Clientes (teléfono y correo únicos)

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 4.1 | Crear cliente | Nombre + WhatsApp + correo + notas | Aparece con avatar y 0 visitas |
| 4.2 | Teléfono repetido | Crear otro con el mismo teléfono | "Ese teléfono o correo ya está registrado" |
| 4.3 | Correo repetido | Otro teléfono + mismo correo | Mismo aviso |
| 4.4 | Correo inválido | `juan@` | "Correo no válido" |
| 4.5 | Buscar | Buscador por nombre, teléfono o correo | Filtra la lista |
| 4.6 | Ficha completa | Tras ventas: abrir ficha | Visitas, acumulado, días desde última visita, favorito |
| 4.7 | Editar + cumpleaños | Agregar fecha de nacimiento | Aparece 🎂 en la ficha |
| 4.8 | Eliminar | Eliminar cliente | Desaparece (sus citas también) |

## 5. Agenda

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 5.1 | Crear reserva | Cliente + barbero + servicio + mañana 10:00 | Aparece CONFIRMADA |
| 5.2 | Anti-doble reserva | Otra con mismo barbero 10:15 (se cruza) | "Ese profesional ya tiene una reserva en ese horario" |
| 5.3 | Otro barbero sí puede | Misma hora con otro barbero | Se crea sin problema |
| 5.4 | Fecha pasada | Ayer a las 10:00 | "Fecha pasada o inválida" |
| 5.5 | Vista semana | Botón Semana | Muestra 7 días |
| 5.6 | Reprogramar | Reprogramar a otro día/hora libre | Cambia el horario |
| 5.7 | Reprogramar con cruce | A un horario ocupado | Se bloquea con aviso |
| 5.8 | Cambiar estado | PENDIENTE → CONFIRMADA → COMPLETADA | Badge cambia de color y texto en español |
| 5.9 | Cancelar | Cancelar una cita | Pasa a Cancelada; libera el hueco |

## 6. Reserva pública estilo Calendly (¡probar en incógnito!)

Link: `http://localhost:3000/book/barberia-demo` (o tu slug, ver Ajustes).

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 6.1 | Paso 1-2 | Elegir servicio → barbero | Avanza con resumen lateral |
| 6.2 | Días reales | Ver días ofrecidos | Solo días que trabaja ese barbero |
| 6.3 | Huecos reales | Elegir día → ver horas | Cada 30 min según duración; sin horas pasadas si es hoy |
| 6.4 | Día lleno | Reservar todos los huecos y volver | "Ese día está lleno" |
| 6.5 | Reserva completa | Nombre + correo + WhatsApp → Confirmar | Página "¡Listo!" |
| 6.6 | Aparece como PENDIENTE | Como dueño → Agenda | La cita está PENDIENTE |
| 6.7 | Cliente nuevo creado | Clientes | Apareció con nombre/teléfono/correo |
| 6.8 | Correo existente otro teléfono | Reservar con correo de Juan + otro teléfono | "Ese correo ya está registrado con otro teléfono" |
| 6.9 | Teléfono existente | Reservar con teléfono de Juan + su correo | Usa el cliente existente |
| 6.10 | Negocio inexistente | `/book/no-existe` | "Negocio no encontrado" |

## 7. Ventas e historial

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 7.1 | Registrar venta | Cliente + servicio + barbero + valor | Aparece primera; "hoy van $X" se actualiza |
| 7.2 | Historial | Ficha del cliente | La visita suma a visitas y acumulado |
| 7.3 | Dashboard | Resumen | Ingresos del mes y gráfico suben |

## 8. Reactivación + WhatsApp (sin API oficial)

> Nada se envía solo: cada botón abre `wa.me` con el mensaje listo en TU WhatsApp.

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 8.1 | Candidato detectado | Con seed: Juan (última hace ~29d, freq ~15d) | Sale en Resumen y Reactivar |
| 8.2 | Botón recuperar | "Recuperar" en Reactivar | Abre WhatsApp con "Hola Juan… Hace 29 días…" |
| 8.3 | Recordatorio del día | Resumen → Agenda de hoy → "Recordar" | Abre WhatsApp con fecha/hora de la cita |
| 8.4 | WhatsApp en ficha | Ficha de cliente → WhatsApp | Abre chat con saludo |
| 8.5 | Plantillas editables | Ajustes → cambiar textos | Los botones usan los nuevos textos |
| 8.6 | Sin candidatos | Negocio nuevo sin ventas viejas | "Nada por aquí 🎉" |

## 9. Notificaciones push (validar que SÍ funcionan)

> Requisito: Chrome/Edge escritorio o Android. iPhone: solo instalado como PWA.

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 9.1 | Activar | Header → "Activar avisos" → Permitir | Cambia a "🔔 Avisos activos" |
| 9.2 | Push por reserva online | Incógnito: completa una reserva pública | Al dueño le llega push "📅 Nueva reserva" (aun con la pestaña en 2.º plano) |
| 9.3 | Push con app cerrada | Cierra la pestaña (Chrome sigue abierto) y reserva de nuevo | El push IGUAL llega (service worker) |
| 9.4 | Clic en push | Clicar la notificación | Abre `/dashboard/agenda` |
| 9.5 | Recordatorio cron | Cita en próximas 24h + `GET /api/cron/notify` con `Authorization: Bearer <CRON_SECRET>` | Responde `{ok, upcoming24h, orgsNotified, pushed}` y llega push resumen |
| 9.6 | Cron sin secret | Sin header | `401 unauthorized` |
| 9.7 | Desactivar | "Avisos activos" → desactivar | Vuelve a "Activar avisos"; ya no llegan |
| 9.8 | Navegador sin soporte | Abrir en navegador viejo | "push no disponible" (no rompe nada) |

## 10. Inventario

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 10.1 | Crear producto | Cera mate, precio, costo, stock 12, mínimo 3 | Aparece con stock |
| 10.2 | Entrada | +10 por compra | Stock 22 + movimiento ENTRADA |
| 10.3 | Salida/Consumo | Venta o consumo interno | Baja stock + historial |
| 10.4 | Stock insuficiente | Sacar más de lo que hay | "Stock insuficiente" |
| 10.5 | Ajuste | Fijar stock en conteo físico | Stock queda exacto + movimiento AJUSTE |
| 10.6 | Alerta stock bajo | Stock ≤ mínimo | 🔴 en lista + aviso en Resumen |
| 10.7 | Historial | "Últimos movimientos" | Todo registrado con fecha y motivo |

## 11. Importar (no empezar de ceros)

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 11.1 | Descargar plantilla | Importar → Descargar (clientes) | CSV con encabezados + 2 ejemplos, tildes OK en Excel |
| 11.2 | Importar servicios | Llenar 3 filas y subir | "3 creados" + link para verlos |
| 11.3 | Re-subir (duplicados) | Subir el mismo archivo | "0 creados · 3 ya existían" |
| 11.4 | Fila con error | Fila sin nombre | Se cuenta en errores con n.º de fila |
| 11.5 | Formato precio | `25.000` y `$25.000` | Ambos importan 25000 |
| 11.6 | Archivo .xlsx | Guardar como Excel y subir | Importa igual |
| 11.7 | Archivo vacío | Subir CSV solo con encabezados | "no tiene filas de datos" |
| 11.8 | Email duplicado | Cliente con correo existente | Se omite (no duplica) |

## 12. Dashboard y multi-negocio

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|--------------------|
| 12.1 | KPIs | Resumen con datos | Ingresos, citas hoy, clientes, reactivación coherentes |
| 12.2 | Gráfico | Pasar mouse sobre el área | Tooltip con fecha e importe |
| 12.3 | Tops | Con ventas del mes | Servicios y barberos ordenados con barras |
| 12.4 | Negocio nuevo vacío | Crear 2.º negocio | Guía de 4 pasos, todo en ceros |
| 12.5 | Aislamiento | 2.º negocio no ve clientes/citas del 1.º | Nada cruzado (script `scripts/isolation-check.ts` también pasa) |
| 12.6 | Vertical distinto | Negocio tipo Spa | Menú dice "Terapeutas/Tratamientos", icono 💆 |

## 13. Casos borde

| # | Escenario | Resultado esperado |
|---|-----------|--------------------|
| 13.1 | Eliminar barbero con reservas activas | Bloqueado con aviso |
| 13.2 | Invitación vencida/usada | "Vencida" / "no válida" |
| 13.3 | Aceptar invitación con otro correo logueado | Aviso de correo distinto |
| 13.4 | Reserva pública con servicio desactivado a mitad del flujo | "Selección no disponible" |
| 13.5 | Dos personas reservan el mismo hueco a la vez | Solo una pasa; la otra ve "horario ocupado" |

---

### Checklist rápido (lo mínimo para dar luz verde)

- [ ] 1.3 login demo · 1.7 logout · 2.3 aceptar invitación
- [ ] 3.5 crear barbero · 4.1 crear cliente · 5.1 + 5.2 agenda y anti-doble
- [ ] 6.5 reserva pública en incógnito · 7.1 venta
- [ ] 8.2 WhatsApp reactivación · 9.1 + 9.2 push activar y recibir
- [ ] 10.2 movimiento inventario · 11.2 importar · 12.5 aislamiento
