# Generic Manage Clients

SaaS genérico para negocios con clientes recurrentes: **clientes → reservas → visitas → deberían volver → WhatsApp (wa.me)**.

Stack desacoplado (sin Supabase): Next.js 16 + Prisma 6 + Postgres + Auth.js v5 (Google + email).

## Quickstart local (sin VPS, sin dominio)

```bash
cp .env.example .env
docker compose up -d db
npx prisma migrate dev
npm run db:seed   # demo@generic.local / demo1234
npm run dev       # http://localhost:3000
```

Probar: login → onboarding crea negocio → `/dashboard` muestra "Deberían volver" (Juan, seed) con botón WhatsApp wa.me.

## Google OAuth

Ver `docs/SETUP-GOOGLE-OAUTH.md`. Sin claves Google, email+password funciona.

## Deploy $0

Ver `docs/DEPLOY-RENDER-NEON.md`: Neon (DB) + Render Web Free (app `*.onrender.com`) + cron-job.org.

## Estructura

- `prisma/schema.prisma` — Org/Membership/Staff/Service/Customer/Appointment/Sale/Template + modelos Auth.js
- `src/auth.ts` — Google + Credentials
- `src/lib/tenant.ts` — aislamiento por orgId
- `src/lib/verticals.ts` — `business_type` configurable (barber/salon/spa/pets/cafe/...)
- `src/lib/whatsapp.ts` — `buildWaLink` + `computeReactivation` (regla promedio + margen 3d)
- `src/app/dashboard` — KPIs + reactivación · `src/app/book/[slug]` — reserva pública
