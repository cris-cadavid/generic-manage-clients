# Google OAuth (gratis, sin dominio)

Auth.js v5 usa `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`. Sin esto el botón Google falla; email+password sigue funcionando.

1. Ve a https://console.cloud.google.com → crea proyecto `generic-manage-clients`.
2. APIs y servicios → Credenciales → Crear ID de cliente OAuth → tipo Web.
3. Orígenes autorizados:
   - `http://localhost:3000`
   - `https://TU-APP.onrender.com` (cuando la tengas)
4. URIs de redirección autorizados:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://TU-APP.onrender.com/api/auth/callback/google`
5. Copia Client ID/Secret a `.env` (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
6. Reinicia `npm run dev`.

Error típico `redirect_uri_mismatch` = falta agregar la URL exacta de arriba en la consola.
