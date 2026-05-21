# Guía de Configuración de Web Push Notifications 🔔

Nuestra aplicación soporta notificaciones push reales en navegadores y celulares. Para que los navegadores confíen en nuestras notificaciones, necesitamos generar un par de llaves criptográficas llamadas **VAPID Keys** (Voluntary Application Server Identification).

## 1. Generar tus llaves VAPID

Dado que ya tenemos la librería instalada en el proyecto, generar estas llaves es tan sencillo como ejecutar un comando en tu terminal.

Abre tu terminal en la carpeta del proyecto y ejecuta:
```bash
npx web-push generate-vapid-keys
```

La consola te devolverá algo parecido a esto:
```text
=======================================
Public Key:
BO_tu_llave_publica_super_larga_aqui...

Private Key:
tu_llave_privada_super_secreta_aqui...
=======================================
```

## 2. Configurar Variables de Entorno (Local)

Copia esas dos llaves y ponlas en tu archivo `.env.local` junto con un correo de contacto:

```env
# La llave pública que el navegador usará para suscribirse
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BO_tu_llave_publica_super_larga_aqui...

# La llave privada que el servidor usará para firmar (¡Secreta!)
VAPID_PRIVATE_KEY=tu_llave_privada_super_secreta_aqui...

# Obligatorio para el estándar VAPID (debe tener "mailto:")
VAPID_MAILTO=mailto:contacto@tu-dominio.com
```

## 3. Entorno de Producción (Vercel)

Cuando vayas a lanzar tu aplicación al público, **debes** registrar exactamente estas mismas 3 variables (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO`) en los *Environment Variables* del dashboard de Vercel.

## 4. Supabase Vault (Opcional, según arquitectura)

Si recuerdas la guía de Supabase, habíamos guardado una llave secreta en la base de datos de producción mediante el comando:
```sql
select vault.create_secret('TU_CLAVE_PRIVADA_VAPID_DE_PUSH', 'push_send_secret', 'Llave para notificaciones web push');
```
Si la base de datos es la encargada de disparar tareas de notificación en el futuro usando Cron Jobs, debes poner la misma `VAPID_PRIVATE_KEY` que generaste en el paso 1 dentro del código SQL de Supabase.

## 5. Probar las notificaciones

Una vez configurado tu `.env.local`, reinicia el servidor (`npm run dev`).
1. Entra a tu aplicación e inicia sesión.
2. Al navegar, el navegador (Chrome/Safari) te pedirá permiso para enviarte notificaciones. Acéptalo.
3. Si activas una acción que desencadene una notificación o usas el panel de configuración de la app, deberías recibir una alerta nativa de tu sistema operativo.

> **Nota para iOS (iPhone):** Las notificaciones push web en iPhone solo funcionan si el usuario "Añade la página a la pantalla de inicio" (PWA) usando Safari. En Android, Mac y Windows, funcionan desde cualquier navegador moderno.
