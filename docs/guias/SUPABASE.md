# Guía de Configuración de Supabase (Desarrollo y Producción) 🗄️

Nuestra arquitectura utiliza **dos proyectos de Supabase completamente separados**. Esto garantiza que nunca borres ni afectes datos reales de pacientes mientras programas o haces pruebas.

---

## 🏗️ 1. Entorno de Desarrollo (Local / Staging)

Este es tu "laboratorio". Aquí puedes crear usuarios falsos, borrar tablas y probar nuevas funcionalidades sin miedo.

### Paso 1: Crear el proyecto
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) y crea un nuevo proyecto llamado `HCE Staging` (o similar).
2. Guarda la contraseña de la base de datos en un lugar seguro (aunque rara vez la usarás directamente).

### Paso 2: Ejecutar las Migraciones (La Estructura)
Para que la base de datos tenga todas las tablas de pacientes, consultas, etc.:
1. Ve al menú izquierdo **"SQL Editor"**.
2. Abre el archivo de tu código: `supabase/migrations/000_production_full_schema.sql`.
3. Copia TODO el contenido del archivo, pégalo en el SQL Editor de Supabase y dale a **Run**.
*(Si la consola de Supabase arroja alertas rojas de "Advisor", ignóralas siempre y cuando el código termine de ejecutarse con "Success", nosotros ya hemos blindado las reglas RLS).*

### Paso 3: Configurar Autenticación
1. Ve a **Authentication** -> **Providers**.
2. Asegúrate de que **Email** esté habilitado.
3. Para hacer las pruebas locales más rápidas, te recomendamos **apagar** la opción *"Confirm email"*. Así no tendrás que ir a tu correo cada vez que crees un médico falso.

### Paso 4: Claves de Entorno
1. Ve a **Project Settings** (Engranaje) -> **API**.
2. Copia la URL del proyecto y pégala en `NEXT_PUBLIC_SUPABASE_URL` dentro de tu `.env.local`.
3. Copia la llave **`anon` `public`** y pégala en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copia la llave **`service_role` `secret`** y pégala en `SUPABASE_SERVICE_ROLE_KEY`.

> [!CAUTION]
> La llave `service_role` tiene permisos absolutos y se salta todas las políticas de seguridad (RLS). **JAMÁS** debe tener el prefijo `NEXT_PUBLIC_` ni usarse en el frontend.

---

## 🚀 2. Entorno de Producción (Datos Reales)

Este es el proyecto que usarán tus verdaderos clientes en `glyphix.app`. La regla de oro es: **Nunca modificar tablas manualmente aquí**, siempre hazlo en Staging primero y luego replica el cambio.

### Paso 1: Crear el proyecto
Crea un nuevo proyecto en Supabase llamado `HCE Production`. Asegúrate de elegir la región de servidor más cercana a tus usuarios (ej. US East).

### Paso 2: Ejecutar las Migraciones Base
Igual que en desarrollo:
1. Ve al **SQL Editor**.
2. Pega y ejecuta el archivo `supabase/migrations/000_production_full_schema.sql`.

### Paso 3: Extensiones Obligatorias (¡Crítico!)
Nuestro backend utiliza tareas en segundo plano (Cron Jobs) y llamadas de red.
1. Ve a **Database** -> **Extensions**.
2. Busca y habilita **`pg_cron`** (Para programar tareas).
3. Busca y habilita **`pg_net`** (Para enviar peticiones HTTP desde Postgres).
*(Nota: Si ves la extensión `http`, déjala deshabilitada. Usamos `pg_net` por seguridad).*

### Paso 4: Configurar Autenticación
1. Ve a **Authentication** -> **Providers**.
2. Habilita **Email**.
3. **ACTIVA** la opción *"Confirm email"*. En producción sí queremos que los médicos verifiquen que su correo es real.
4. Ve a **Authentication** -> **URL Configuration**.
5. Cambia el **Site URL** a tu dominio de producción: `https://glyphix.app`.

### Paso 5: Claves de Vercel
1. Ve a **Project Settings** -> **API**.
2. Entra al dashboard de [Vercel](https://vercel.com).
3. En los "Environment Variables" de tu proyecto, agrega las variables de producción:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (Debe ser `https://glyphix.app`)

### Paso 6: Configurar Secrets de la Base de Datos
La base de datos necesita llaves para mandar notificaciones Push y Emails de Resend por sí sola (a través de los Cron Jobs).
1. Ve al **SQL Editor** en Supabase Producción.
2. Ejecuta estos comandos (reemplazando por tus llaves reales):
```sql
select vault.create_secret('TU_LLAVE_DE_RESEND', 'resend_email_secret', 'Llave para enviar emails transaccionales');
select vault.create_secret('TU_CLAVE_PRIVADA_VAPID_DE_PUSH', 'push_send_secret', 'Llave para notificaciones web push');
```

---

## 🔄 Resumen de Mantenimiento

Cuando quieras agregar una nueva tabla o funcionalidad en el futuro:
1. Escribes el SQL y lo pruebas en **Staging**.
2. Si funciona, lo agregas a un nuevo archivo en tu código (ej. `001_nueva_tabla.sql`).
3. Haces commit en Git.
4. Vas a tu proyecto de **Producción** en Supabase y ejecutas `001_nueva_tabla.sql` en el SQL Editor para que las bases de datos vuelvan a ser gemelas.
