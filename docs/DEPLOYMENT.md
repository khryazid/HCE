# Guía de Despliegue (Deployment) — Glyphix HCE

Esta guía documenta cómo desplegar Glyphix en **Vercel** (Frontend / API Edge) y **Supabase** (Backend DB).

## 1. Despliegue del Backend (Supabase)

1. En el Dashboard de Supabase, navega a **SQL Editor**.
2. Copia todo el contenido del archivo `supabase/migrations/000_production_full_schema.sql` y pégalo.
3. Ejecuta el script completo. Esto creará el schema, aplicará las políticas de RLS, creará funciones RPC y programará los cron jobs.
4. **Configuraciones adicionales (Database > Extensions):**
   - Asegúrate de que las extensiones `pg_cron` y `pg_net` estén activas.
   - Deshabilita la extensión `http` (migramos su uso hacia `pg_net` por seguridad).
5. **Configuración de Variables Base de Datos:**
   - En el SQL Editor, configura los secretos del webhook e email:
     ```sql
     insert into public.app_config (key, value) values
       ('site_url', 'https://tu-dominio.com'),
       ('push_send_secret', 'GENERADO_OPENSSL'),
       ('resend_email_secret', 'GENERADO_OPENSSL');
     ```
   - Configura el super admin: `ALTER DATABASE postgres SET app.admin_email = 'admin@tu-dominio.com';`

## 2. Despliegue del Frontend y APIs (Vercel)

1. Importa el repositorio en Vercel.
2. Establece el Build Command a: `npm run build`
3. En la sección **Environment Variables**, configura lo siguiente:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (desde Configuración API de Supabase).
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PRICE_ID` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (URL final del proyecto)
   - `GEMINI_API_KEY` y `GEMINI_MODEL` (`gemini-2.0-flash`)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`
   - `PUSH_SEND_SECRET` y `RESEND_EMAIL_SECRET` (Mismos valores que guardaste en Supabase `app_config`).
   - `NEXT_PUBLIC_IDB_MASTER_KEY` (Generado con `openssl rand -base64 32` - ¡Mantén a salvo esta clave!).
   - `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.

## 3. Tareas Post-Despliegue

1. **Stripe Webhooks:** 
   - Añade el endpoint `https://tu-dominio.com/api/stripe/webhook` en el dashboard de Stripe.
   - Eventos a suscribir: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`.
2. **Resend / DNS:**
   - Verifica los registros DKIM/SPF del dominio `tu-dominio.com` en Resend para permitir el envío de correos.

## 4. GitHub Actions (CI/CD Pipelines)

El repositorio incluye automatización robusta en `.github/workflows/`:
- **`ci.yml`**: Ejecuta Linter, Typecheck y Vitest en cada PR y push a `main`. Previene despliegues rotos.
- **`nightly.yml`**: Ejecuta tests E2E y sube reportes (requiere que los secrets `E2E_EMAIL` y `E2E_PASSWORD` estén configurados en GitHub Secrets).
- **`codeql.yml`**: Análisis de seguridad automatizado en cada push a `main`.
- **`lighthouse.yml`**: Auditoría de métricas PWA/Core Web Vitals.

**Para que los pipelines pasen exitosamente:** 
1. Asegúrate de configurar en **GitHub Secrets** todas las claves requeridas para que los tests pasen (variables `NEXT_PUBLIC_*`).
2. Nunca eludas el CI (ej. push forzado) ya que Vercel también depende de que el build local de GitHub pase antes de compilar en el Edge.
