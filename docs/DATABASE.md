# Base de Datos y Schema — Glyphix HCE

## 1. Única Fuente de Verdad (Single Source of Truth)

El esquema completo de la base de datos vive en un archivo consolidado e idempotente:

**`supabase/migrations/000_production_full_schema.sql`**

Este archivo contiene:
1. Creación de tablas e índices (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
2. Funciones y RPCs (`CREATE OR REPLACE FUNCTION`).
3. Triggers y configuraciones de pg_cron.
4. Políticas de Seguridad por Nivel de Fila (RLS) (`DROP POLICY IF EXISTS ... CREATE POLICY ...`).
5. Configuración de Storage y Secrets.
6. Cifrado de secretos con pgcrypto (`set_config_secret` / `get_config_secret`).
7. Anonimización GDPR (`anonymize_patient`).

### Migraciones incrementales

A partir de mayo 2026, los cambios nuevos se documentan adicionalmente como migraciones incrementales en archivos separados:

| Archivo | Contenido |
|---|---|
| `000_production_full_schema.sql` | Schema completo (fuente de verdad, idempotente) |
| `001_encryption_and_gdpr.sql` | Cifrado app_config + GDPR anonymization |

**Flujo para nuevos cambios:**
1. Añadir el cambio al schema completo `000_production_full_schema.sql` (mantener idempotencia)
2. Crear un archivo incremental `NNN_descripcion.sql` con solo los cambios nuevos
3. Aplicar en producción: ejecutar el archivo incremental en Supabase SQL Editor
4. Ejecutar `npm run db:types` para regenerar los tipos TypeScript

## 1b. Cifrado de Secretos (`app_config`)

Los secretos almacenados en `app_config` (push_send_secret, resend_email_secret, etc.) pueden cifrarse en reposo usando pgcrypto:

```sql
-- 1. Configurar passphrase (una sola vez por BD):
ALTER DATABASE postgres SET app.encryption_key = 'resultado-de-openssl-rand-base64-32';

-- 2. Cifrar un secreto:
SELECT set_config_secret('push_send_secret', 'mi-secreto-real');

-- 3. Leer un secreto (descifra automáticamente):
SELECT get_config_secret('push_send_secret');
```

Las funciones SECURITY DEFINER en cron (push, email) siguen leyendo `value` directamente. Para usar cifrado completo, actualizar esas funciones para usar `get_config_secret()` en vez de `SELECT value FROM app_config`.

## 1c. Anonimización GDPR

La función `anonymize_patient(patient_uuid)` implementa el "Derecho al Olvido":
- Reemplaza nombre, cédula con un ID anónimo (`ANON-xxxxxxxx`)
- Borra teléfono y fecha de nacimiento
- Cancela citas futuras pendientes
- **Preserva** registros clínicos (retención legal 5-15 años)
- Registra la acción en `audit_logs` con hash del nombre original


## 2. Tipos de TypeScript Generados

Los tipos de TypeScript que el frontend y las APIs utilizan están atados estrechamente a este schema.

- Archivo de tipos: `src/types/supabase.types.ts`
- **Generación:** NUNCA edites `supabase.types.ts` manualmente. 
- **Comando:** Siempre ejecuta `npm run db:types` después de aplicar cualquier cambio en el archivo SQL.

## 3. Reglas de Diseño de Base de Datos

- **Multi-Tenant (Aislamiento):** Toda tabla clínica (pacientes, historias) incluye un `clinic_id`. Las políticas RLS restringen rigurosamente el acceso para que el usuario autenticado solo vea los registros de su clínica (verificando vía su registro en `clinic_members`).
- **Idempotencia de Funciones:** Asegúrate de usar `OR REPLACE` para funciones, y condicionales para triggers.
- **SECURITY DEFINER:** Las funciones como `is_super_admin()` o `log_audit_event()` que trascienden el RLS usan `SECURITY DEFINER`. **Siempre** deben incluir la directiva `SET search_path = public` para evitar ataques de inyección de esquemas.

## 4. Auditoría Criptográfica

Para el cumplimiento legal de la Historia Clínica Electrónica, cada acto médico (`clinical_records`) es sellado por un trigger que llama a `log_audit_event`.
Esta función encadena criptográficamente (SHA-256) el historial, de modo que cada registro contiene un `previous_hash`. 
Los `audit_logs` **son inmutables**; los deletes de más de 90 días fueron estrictamente prohibidos (se desactivó el cron de limpieza `cleanup-audit-logs`).

## 5. Proceso de Backups y Rollback (PITR)

Supabase gestiona los backups automáticamente, pero todo desarrollador debe conocer el flujo de desastres:

### Point-in-Time Recovery (PITR)
- Las bases de datos de producción (Plan Pro o superior) tienen activado **PITR** (Point-in-Time Recovery).
- Si un despliegue de frontend corrompe datos masivamente, el Rollback no se hace mediante scripts manuales; se hace a través del **Dashboard de Supabase > Database > Backups > PITR**.
- **Nota Crítica de Despliegue:** Antes de correr un script SQL destructivo (e.g., `DROP TABLE`, migraciones de tipos de datos), SIEMPRE genera un "Logical Backup" manual desde el dashboard por precaución, aunque el PITR esté activo.

### Rollback de Código (Vercel)
Si una nueva versión (commit a `main`) rompe la UI o las APIs:
1. Abre el Dashboard de Vercel.
2. Navega a la pestaña de "Deployments".
3. Localiza el despliegue anterior estable (botón derecho > **Promote to Production** o **Rollback**).
4. Revierte el commit en Git: `git revert <commit-id>` y pushea a `main` para emparejar el código con Vercel.
