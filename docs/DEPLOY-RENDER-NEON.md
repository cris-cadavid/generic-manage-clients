# Deploy $0 sin VPS ni dominio: Neon + Render + cron-job.org

## 1. DB (Neon Free)
1. https://neon.tech → New Project `gmc` (región cercana a tu Render).
2. Copia `DATABASE_URL` pooled (`?sslmode=require`).
3. Local: `DATABASE_URL` apunta a Docker; prod: a Neon.

## 2. App (Render Web Free)
1. Sube `generic-manage-clients` a GitHub.
2. Render → New Web Service → conecta repo.
   - Build: `npm install && npx prisma migrate deploy && npm run build`
   - Start: `npm start`
   - Env: `DATABASE_URL` (Neon), `AUTH_SECRET` (openssl rand -base64 32),
     `AUTH_GOOGLE_ID/SECRET`, `NEXT_PUBLIC_APP_URL=https://TU-APP.onrender.com`, `CRON_SECRET`.
3. Agrega esa URL en Google OAuth (ver SETUP-GOOGLE-OAUTH.md).

## 3. Cron gratis
cron-job.org → cada 15min → `GET https://TU-APP.onrender.com/api/cron/notify`
Header: `Authorization: Bearer TU_CRON_SECRET`.

## Límites conocidos
- Render Free duerme a los 15min sin tráfico (cold ~30s). Mitigación: cron a `/api/health` cada 14min.
- Neon scale-to-zero tras 5min (200-500ms primer query). Normal en MVP.
- Render Postgres Free NO se usa (expira 30 días).
