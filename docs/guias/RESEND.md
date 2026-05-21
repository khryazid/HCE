# Guía de Configuración de Resend (Emails Transaccionales) 📧

Resend es el servicio que usa la aplicación para enviar correos automáticos a los médicos. Por ejemplo: el aviso de que su prueba gratuita está por terminar, o el recordatorio de seguimiento de paciente.

## 1. Crear tu cuenta y obtener la API Key

1. Ve a [resend.com](https://resend.com) y crea una cuenta gratuita.
2. Una vez dentro del dashboard, haz clic en **"API Keys"** en el menú izquierdo.
3. Haz clic en **"Create API Key"**, ponle un nombre (ej. `HCE Dev`) y haz clic en **Add**.
4. Copia la llave generada (empieza con `re_...`) y ponla en tu `.env.local`:
   ```env
   RESEND_API_KEY=re_tu_api_key_aqui
   ```

> [!CAUTION]
> Esta llave solo se muestra UNA vez. Si la pierdes, tendrás que crear una nueva. Guárdala de inmediato.

## 2. Verificar tu Dominio (CRÍTICO para Producción)

Para enviar correos desde tu propio dominio (ej. `notificaciones@glyphix.app`) en lugar del dominio genérico de Resend, debes **verificar** que eres dueño de ese dominio.

1. En el dashboard de Resend, ve a **"Domains"** → **"Add Domain"**.
2. Escribe tu dominio: `glyphix.app` (sin el `www`).
3. Resend te dará unos **registros DNS** (tipo TXT y MX) para que los agregues en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.).
4. Agrega esos registros en tu proveedor y vuelve a Resend para hacer clic en **"Verify"**.
5. La verificación puede tomar entre 5 minutos y 24 horas (depende de tu proveedor de dominio).

> [!NOTE]
> En desarrollo local no necesitas verificar el dominio. Resend tiene un dominio de prueba que funciona sin configuración extra: `onboarding@resend.dev`. Puedes usarlo para hacer pruebas rápidas sin necesitar un dominio propio.

## 3. Configurar Variables de Entorno

### Desarrollo Local (`.env.local`)
```env
# La API Key de tu proyecto de pruebas
RESEND_API_KEY=re_tu_api_key

# Mientras no tengas dominio verificado, usa la dirección de prueba de Resend:
RESEND_FROM_EMAIL=onboarding@resend.dev

# Secreto para que la base de datos pueda llamar a esta API de forma segura
# Genera uno con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
RESEND_EMAIL_SECRET=tu_secreto_hex_aqui
```

### Producción (Variables de Vercel)
```env
# La API Key de tu proyecto de producción
RESEND_API_KEY=re_tu_api_key_produccion

# Una vez verificado el dominio, usa tu dirección real:
RESEND_FROM_EMAIL=notificaciones@glyphix.app

# El mismo secreto que tienes en desarrollo (o genera uno nuevo)
RESEND_EMAIL_SECRET=tu_secreto_hex_aqui
```

## 4. Correos que Envía la Aplicación

Tu aplicación actualmente tiene integrados los siguientes correos automáticos:

| Ruta API | Disparador | Descripción |
|---|---|---|
| `/api/email/trial-ending` | Cron Job de Supabase | Avisa al médico que su prueba gratuita termina en N días |
| `/api/email/followup` | Desde el dashboard | Recordatorio de seguimiento de un paciente |

Ambos endpoints están protegidos con un encabezado `x-email-secret` que verifica la variable `RESEND_EMAIL_SECRET`, por lo que nadie externo puede dispararlos sin esa clave.

## 5. Supabase Vault (Para los Cron Jobs)

El Cron Job de Supabase que avisa sobre el fin de la prueba necesita llamar a tu API con el secreto. Recuerda que en la guía de Supabase Producción se configuró de la siguiente forma:

```sql
select vault.create_secret('TU_RESEND_API_KEY', 'resend_email_secret', 'Llave para enviar emails transaccionales');
```

Cuando vayas a configurar el cron job en Supabase, el valor que pongas en el Vault debe ser el mismo que tienes en `RESEND_EMAIL_SECRET`.

## 6. Probar el Envío de Correos Localmente

Con el servidor corriendo (`npm run dev`), puedes probar el envío de un correo de prueba directamente desde tu terminal:

```bash
curl -X POST http://localhost:3000/api/email/followup \
  -H "Content-Type: application/json" \
  -H "x-email-secret: tu_secreto_hex_aqui" \
  -d '{"doctor_email":"tu@correo.com","doctor_name":"Dr. Prueba","patient_name":"Juan García"}'
```

Si recibes un JSON con `{"success":true}`, el correo fue enviado. Revisa tu bandeja de entrada.
