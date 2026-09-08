# Tareas Manuales de Configuración Pendientes

Este documento enumera las configuraciones de infraestructura, variables de entorno y servicios externos que requieren acción manual en consolas externas (Supabase, Resend, Vercel / DNS).

---

## 1. Migraciones de Base de Datos en Supabase

En local se añadieron dos nuevas migraciones en `supabase/migrations/`:
- `20260907235332_otp_inbox_and_crypto_context.sql` (esquema del buzón OTP, cifrado asimétrico por bóveda, políticas RLS endurecidas).
- `20260908143000_otp_fk_indexes.sql` (índices de llaves foráneas para rendimiento en consultas de OTP).

### Qué hacer:
- Si usas la **Supabase CLI**:
  ```bash
  supabase db push
  ```
- O si aplicas vía el **Dashboard de Supabase**:
  1. Abrir `SQL Editor` en tu proyecto de Supabase.
  2. Ejecutar secuencialmente el contenido de ambos archivos `.sql`.

---

## 2. Variables de Entorno en Vercel / Hosting

En tu `.env.example` se establecieron los nuevos requerimientos. Debes cargar en el panel de **Vercel** (o entorno productivo):

| Variable | Descripción / Valor recomendado | Crítica para |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu instancia Supabase | Auth y Vault |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anónima de Supabase | Auth y Vault |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada de servicio de Supabase | Webhooks server-side de OTP |
| `OTP_ENABLED` | Dejar en `false` hasta terminar los pasos 3 y 4 | Ingesta segura OTP |
| `OTP_RECEIVING_DOMAIN` | Subdominio receptor (ej: `codigos.pontorno.com`) | Generación de alias OTP |
| `RESEND_API_KEY` | Clave de API generada en Resend | Acceso a mensajes crudos |
| `RESEND_WEBHOOK_SECRET` | Secreto Svix provisto por el webhook de Resend | Verificación de firma anti-tamper |
| `OTP_RAW_EMAIL_HOSTS` | Hosts permitidos para descargar el email crudo | Prevención de SSRF |
| `CRON_SECRET` | Token secreto aleatorio | Protección del endpoint `/api/cron/otp` |

---

## 3. Configuración de Correo Entrante en Resend y DNS

Para habilitar la recepción real de códigos OTP:
1. **Configurar Subdominio en Resend:**
   - Registrar un subdominio dedicado (ej: `codigos.tudominio.com`) en [Resend Inbound](https://resend.com/docs/dashboard/receiving/introduction).
   - Crear los registros MX y TXT (SPF/DKIM) en tu proveedor de DNS (Cloudflare, Namecheap, Vercel, etc.).
2. **Crear el Webhook de Resend:**
   - Endpoint destino: `https://<tu-app-en-vercel>/api/webhooks/email-otp`.
   - Evento: `email.received`.
   - Copiar el `Signing Secret` generado y pegarlo en `RESEND_WEBHOOK_SECRET`.
3. **Cron Job para Limpieza de OTPs Expirados:**
   - En `vercel.json` ya está configurada la ruta `/api/cron/otp`. Asegurar que en Vercel Cron Jobs esté activo con el header `Authorization: Bearer <CRON_SECRET>`.

---

## 4. Gestión de los Pull Requests en GitHub

Una vez que ejecutes `git push origin main`:
1. **PRs de Dependabot (#3 a #7):**
   - Como `main` ya tiene instaladas las versiones actualizadas (incluyendo Vitest 5.0.0, PostCSS 8.5.28, Autoprefixer 10.5.5, @types/react-dom 19.2.7), Dependabot debería marcar la mayoría como cerrados o resueltos.
   - En caso de que alguno quede abierto por discrepancia en el lockfile viejo, ciérralos manualmente con un comentario indicando: *"Incorporado y validado en commit 551bfd3"*.
