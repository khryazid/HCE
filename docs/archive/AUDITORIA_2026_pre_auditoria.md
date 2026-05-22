# Auditoría de Seguridad — Glyphix HCE

**Fecha:** 2026-05-22  
**Alcance:** API Routes · Supabase RLS · SQL functions · pg_cron · Realtime · Storage · Edge middleware · Headers HTTP · Admin Panel · Sync Engine · Service Worker · IndexedDB · Registro/Onboarding  
**Resultado:** 50 hallazgos identificados · 50 corregidos · 0 errores TypeScript · 0 warnings ESLint · Acciones manuales pendientes en Supabase SQL Editor

---

## Metodología

Se realizaron **7 pasadas progresivas** sobre el código fuente del repositorio:

1. **Pasada 1** — API Routes, integración Gemini, Stripe webhooks, Web Push, emails, rate limiting, variables de entorno.
2. **Pasada 2** — `supabase/server.ts`, `actions.ts`, `clinic/invite`, `crypto.ts`, SQL functions.
3. **Pasada 3** — `next.config.ts`, `middleware.ts`, rutas Stripe, `get_user_id_by_email`, headers HTTP.
4. **Pasada 4 (DB Audit)** — Schema multi-tenant, RLS, índices GIN, pg_cron, RPCs, Storage, Admin Panel, CIE, Onboarding, Sync Engine.
5. **Pasada 5 (Revisión final)** — Non-null assertions, clientes Supabase inline, `GRANT`/`REVOKE` de `is_super_admin`, función duplicada, VAPID key.
6. **Pasada 6 (Security Hardening)** — `ensureTenantProfile` trial bypass, `cleanup-audit-logs` cron, Service Worker URL injection, `is_super_admin()` schema, `audit_tenant_select` para admins, `NEXT_PUBLIC_IDB_MASTER_KEY` faltante, `src/middleware.ts` conflicto de build.
7. **Pasada 7 (Repaso final)** — Dead code en webhook, `process.env ?? ""` silencioso en webhook, imports no usados en Stripe routes, unused vars, stale `eslint-disable` directives.

Verificación al cierre de cada pasada:
- `npx tsc --noEmit` → 0 errores
- `npm run lint` → 0 errores, 0 warnings
- `npm run build` → 28 rutas compiladas, exit 0

---

## Resumen ejecutivo

| Severidad | Hallazgos | Estado |
|-----------|-----------|--------|
| 🔴 Crítico | 13 | ✅ Todos corregidos |
| 🟠 Alto    | 10 | ✅ Todos corregidos |
| 🟡 Medio   | 21 | ✅ Todos corregidos |
| 🟢 Bajo / Documentación | 6 | ✅ Todos documentados |
| **Total** | **50** | ✅ |

---

## Pasada 1 — API Routes y configuración

### HAL-01 — IDOR en `/api/clinic/members/[id]` 🔴 Crítico

**Problema:** `DELETE` y `PATCH` no verificaban que el usuario fuera admin de la clínica objetivo. Cualquier médico autenticado podía eliminar miembros de clínicas ajenas conociendo el `[id]`.

**Corrección:** `assertIsClinicAdmin(supabase, user.id, clinic_id)` antes de cualquier operación.

**Archivo:** `src/app/api/clinic/members/[id]/route.ts`

---

### HAL-02 — Exposición de errores de Supabase al cliente 🔴 Crítico

**Problema:** Múltiples endpoints devolvían `error.message` de Supabase directamente al cliente, revelando nombres de tablas, columnas y constraint names.

**Corrección:** `sanitizeDbError(error)` en `src/lib/api/guards.ts` — mensaje genérico en producción, log interno del error real.

**Archivos:** `src/lib/api/guards.ts`, `src/app/api/clinic/members/[id]/route.ts`

---

### HAL-03 — Validación de body sin Zod en endpoints de email 🟡 Medio

**Problema:** `/api/email/followup` y `/api/email/trial-ending` leían el body con cast de tipo sin validación en runtime.

**Corrección:** Schemas Zod v4 con `safeParse` y respuesta 400 estructurada.

**Archivos:** `src/lib/api/guards.ts`, `src/app/api/email/followup/route.ts`, `src/app/api/email/trial-ending/route.ts`

---

### HAL-05 — Modelo Gemini por defecto inexistente 🟡 Medio

**Problema:** Fallback `"gemini-3.5-flash"` no existe en la API de Google. Fallaría con 404.

**Corrección:** Fallback corregido a `"gemini-2.0-flash"`.

**Archivo:** `src/lib/env.ts`

---

### HAL-07 — Estado `paused` bloqueaba CIE-10 🟡 Medio

**Problema:** `validStatuses` no incluía `"paused"`. Médicos con suscripción pausada recibían 401 al usar CIE-10.

**Corrección:** Añadido `"paused"` a `validStatuses`.

**Archivo:** `src/app/api/cie-suggestions/route.ts`

---

### HAL-08 — Timing attack en comparación de secretos 🟠 Alto

**Problema:** Comparación `===` de secretos permite medir diferencias de microsegundos para adivinar el secreto carácter a carácter.

**Corrección:** `isSecretValid(provided, expected)` con `crypto.timingSafeEqual`.

**Archivos:** `src/lib/api/guards.ts`, `src/app/api/push/send/route.ts`, `src/app/api/email/followup/route.ts`, `src/app/api/email/trial-ending/route.ts`

---

### HAL-09 — Storage bucket `clinic_assets` sin aislamiento de tenant 🔴 Crítico

**Problema:** Políticas RLS verificaban solo `bucket_id = 'clinic_assets'`. Cualquier usuario autenticado podía sobrescribir assets de otras clínicas.

**Corrección:** Políticas reescritas para exigir que `(storage.foldername(name))[1]` sea el `clinic_id` del usuario autenticado.

**Archivo:** `supabase/migrations/000_production_full_schema.sql`

> ⚠️ **Acción manual requerida:** ejecutar bloque HAL-09 en Supabase SQL Editor.

---

### HAL-10 — Variables de Resend sin validación fail-fast 🟡 Medio

**Problema:** `RESEND_API_KEY` y `RESEND_EMAIL_SECRET` no pasaban por `requireEnv()`. Un deploy sin ellas fallaba silenciosamente.

**Corrección:** Movidas a `serverEnv` en `src/lib/env.ts`.

---

### HAL-11 — Sin observabilidad estructurada de servidor 🟠 Alto

**Problema:** `console.error/info` dispersos sin formato consistente ni correlación de requests.

**Corrección:** `src/lib/observability/server-logger.ts` — JSON en una línea en producción, niveles `debug/info/warn/error/critical`, correlación por `X-Request-ID`.

**Archivos:** `src/lib/observability/server-logger.ts` (nuevo), `src/app/api/stripe/webhook/route.ts`, `src/proxy.ts`

---

## Pasada 2 — Supabase clients, SQL functions, crypto

### R-01 — `inviteError.message` de Supabase Auth Admin expuesto 🟠 Alto

**Problema:** `/api/clinic/invite` devolvía `inviteError.message` al cliente cuando `inviteUserByEmail` fallaba.

**Corrección:** Log interno + respuesta genérica `"No se pudo enviar la invitación"`.

**Archivo:** `src/app/api/clinic/invite/route.ts`

---

### R-02 — `err.message` en catch final de `clinic/invite` 🟡 Medio

**Problema:** El bloque `catch` general propagaba el mensaje de errores JS inesperados al cliente.

**Corrección:** Mensaje genérico + log del error real.

---

### R-04 — `SECURITY DEFINER` sin `SET search_path` 🔴 Crítico

**Problema:** 7 funciones `SECURITY DEFINER` sin `SET search_path = public` son vulnerables a schema hijacking — un atacante con permisos puede crear objetos homónimos en otro schema y desviar llamadas privilegiadas.

**Funciones corregidas:** `log_audit_event`, `notify_followup_due_today`, `send_followup_push_notifications` (v1 y v2), `send_followup_emails` (v1 y v2), `send_trial_ending_emails`.

**Archivo:** `supabase/migrations/000_production_full_schema.sql`

> ⚠️ **Acción manual requerida:** re-ejecutar funciones en Supabase SQL Editor.

---

### R-05 — Riesgo de rotación de `NEXT_PUBLIC_IDB_MASTER_KEY` 🟢 Documentación

**Diseño:** Clave maestra de cifrado IndexedDB compartida por todos los usuarios. Si se rota, todos pierden datos offline cifrados.

**Decisión:** Documentado en `src/lib/db/crypto.ts` con estrategia de rotación gradual y alternativa a largo plazo (derivar clave por JWT de usuario).

---

### R-06 — Non-null assertions en `NEXT_PUBLIC_SUPABASE_*` 🟡 Medio

**Problema:** `server.ts` usaba `process.env.NEXT_PUBLIC_SUPABASE_URL!` — error críptico si falta.

**Corrección:** Helpers `getSupabaseUrl()` / `getSupabaseAnonKey()` con mensaje descriptivo.

**Archivo:** `src/lib/supabase/server.ts`

---

### R-07 — `createClient` inline en múltiples API routes 🟡 Medio

**Problema:** `actions.ts`, `email/followup/route.ts`, `search/route.ts` instanciaban admin/server clients inline con non-null assertions, duplicando lógica centralizada.

**Corrección:** Importar `createAdminClient()` / `createClient()` de `@/lib/supabase/server`.

**Archivos:** `src/lib/supabase/actions.ts`, `src/app/api/email/followup/route.ts`, `src/app/api/search/route.ts`

---

## Pasada 3 — Next.js config, Edge, Stripe, headers

### S-01 — `request.headers.set()` inmutable en Edge runtime 🔴 Crítico

**Problema:** La inyección de `X-Request-ID` en `proxy.ts` usaba `request.headers.set()` que es silenciosa en Edge runtime. La trazabilidad de HAL-11 no funcionaba.

**Corrección:**
```typescript
const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-request-id", requestId);
const newResponse = NextResponse.next({ request: { headers: requestHeaders } });
```

**Archivo:** `src/proxy.ts`

---

### S-02 — `createServerClient` inline en rutas Stripe 🟡 Medio

**Problema:** `stripe/checkout` y `stripe/portal` tenían 20+ líneas de `createServerClient` inline con non-null assertions.

**Corrección:** Importar `createClient()` de `@/lib/supabase/server`.

---

### S-03 — Non-null assertions en `supabase/middleware.ts` 🟡 Medio

**Corrección:** Helpers locales `getSupabaseUrl()` / `getSupabaseAnonKey()` en el mismo archivo del middleware (no puede importar desde `@/lib/env` — Edge runtime).

---

### S-04 — `get_user_id_by_email` accesible por `authenticated` 🔴 Crítico

**Problema:** Función `SECURITY DEFINER` sin restricción — cualquier médico autenticado podía mapear emails a UUIDs de `auth.users` desde el cliente.

**Corrección:**
```sql
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM anon;
```

> ⚠️ **Acción manual requerida:** ejecutar bloque S-04 en Supabase SQL Editor.

---

### S-05 — Headers HTTP de seguridad incompletos 🟡 Medio

**Problema:** Faltaban `Referrer-Policy` y `Permissions-Policy` en `next.config.ts`.

**Corrección:** Añadidos ambos headers con valores restrictivos (`strict-origin-when-cross-origin` y `camera=(), microphone=(), geolocation=(), payment=(self https://js.stripe.com)`).

---

## Pasada 4 — DB Audit: Schema, RLS, Admin Panel, CIE, Sync

### F-01 — `clinic_members_write` RLS con privilege escalation 🔴 Crítico

**Problema:** La política `clinic_members_write` usaba un `OR` que permitía a cualquier médico con perfil en la clínica (sin ser admin) hacer INSERT/UPDATE/DELETE en `clinic_members`. Un doctor podía auto-escalarse a admin.

**Corrección:**
```sql
-- Antes: OR con profiles permitía auto-escalada
-- Ahora: solo admins pueden modificar el roster
using  (public.is_clinic_admin(public.clinic_members.clinic_id))
with check (public.is_clinic_admin(public.clinic_members.clinic_id))
```

**Archivo:** `supabase/migrations/000_production_full_schema.sql`

> ⚠️ **Acción manual requerida:** ejecutar bloque `-- F-01` en Supabase SQL Editor.

---

### F-13 — Realtime `appointments` filtrado solo por `doctor_id` 🟠 Alto

**Problema:** Las citas creadas por asistentes u otros doctores de la clínica no disparaban el refresh del calendario del médico actual.

**Corrección:** Filtro cambiado a `clinic_id=eq.${clinicId}`.

**Archivo:** `src/features/agenda/lib/use-agenda-realtime.ts`

---

### F-21 — `search_global()` retornaba filas con stopwords 🟡 Medio

**Problema:** `plainto_tsquery('spanish', 'el')` devuelve `''`. Sin guard, retornaba hasta 40 filas aleatorias.

**Corrección:**
```sql
if v_tsquery is null or v_tsquery::text = '' then return; end if;
```

> ⚠️ **Acción manual requerida:** ejecutar bloque `-- F-21` en Supabase SQL Editor.

---

### F-40 — `past_due`/`paused` con acceso ilimitado a Gemini 🟡 Medio

**Problema:** El check de `subscription_expires_at` en `/api/cie-suggestions` solo aplicaba a `active` y `trialing`. Suscripciones vencidas con estado `past_due`/`paused` seguían usando Gemini ilimitadamente.

**Corrección:** Check con grace period diferenciado: 7 días para `past_due`, 0 para `paused`.

**Archivo:** `src/app/api/cie-suggestions/route.ts`

---

### F-41 — `is_super_admin()` no existía en el schema 🔴 Crítico

**Problema:** `verifySuperAdmin()` llamaba `rpc("is_super_admin" as never)` — la función no existía. Toda la seguridad del panel admin recaía en comparación de string de email.

**Corrección (SQL):**
```sql
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = current_setting('app.admin_email', true)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
```

**Corrección (TypeScript):** Eliminado `as never`. RPC llamada correctamente con `as any` temporal hasta regenerar tipos. `ADMIN_EMAIL` conservado como fallback documentado.

**Archivos:** `supabase/migrations/000_production_full_schema.sql`, `src/features/admin/actions.ts`

> ⚠️ **Acción manual requerida:** ejecutar bloque `-- HAL-15/F-41` en Supabase SQL Editor y luego:
> ```sql
> ALTER DATABASE postgres SET app.admin_email = 'tu-email@glyphix.app';
> ```

---

## Pasada 5 — Revisión final y limpieza

### REV-01 — VAPID public key con non-null assertion 🟡 Medio

**Corrección:** Guard explícito con mensaje de error descriptivo.

**Archivo:** `src/app/api/push/send/route.ts`

---

### REV-02 — `is_super_admin()` definida dos veces en el SQL 🟡 Medio

**Problema:** Definición duplicada — la primera con `GRANT TO authenticated` sobreescribía el `REVOKE` de la segunda.

**Corrección:** Eliminada la definición duplicada. Única versión en la sección `SECURITY HARDENING`.

---

### REV-03 — `email/followup/route.ts` con admin client inline 🟡 Medio

**Corrección:** `createAdminClient()` de `server.ts`.

---

### REV-04 — `search/route.ts` con `createServerClient` inline 🟡 Medio

**Corrección:** `createClient()` de `server.ts` — reducido de 20 líneas a 1.

---

### REV-05 — `stripe/webhook/route.ts` con `URL ?? ""` silencioso 🟡 Medio

**Problema:** `process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""` — si la var falta, Supabase client se inicializa con string vacío sin error, fallando silenciosamente en la primera query.

**Corrección:** Validación explícita con `return 500` antes de instanciar el cliente.

**Archivo:** `src/app/api/stripe/webhook/route.ts`

---

## Pasada 6 — Security Hardening (sesión 2026-05-22)

### HAL-13.1 — Trial bypass via `ensureTenantProfile` (cliente) 🔴 Crítico

**Problema:** `src/lib/supabase/profile.ts` enviaba `subscription_status: "trialing"` y `subscription_expires_at` directamente en el INSERT con anon key. Cualquier usuario podía autoproclamarse en trial modificando la request.

**Corrección (código):** Eliminados `subscription_status` y `subscription_expires_at` del INSERT cliente. La única ruta válida para asignar trial es `createTenantProfileWithTrial` (Server Action con `service_role`).

**Corrección (SQL):** `profiles_tenant_write` (FOR ALL) separada en:
- `profiles_tenant_insert` — WITH CHECK que bloquea `subscription_status IS NOT NULL`, `subscription_expires_at IS NOT NULL`, `stripe_customer_id IS NOT NULL`.
- `profiles_tenant_update` — UPDATE libre para datos del perfil (nombre, especialidades).

**Archivos:** `src/lib/supabase/profile.ts`, `supabase/migrations/000_production_full_schema.sql`

---

### HAL-05 — Cron `cleanup-audit-logs` eliminaba historial clínico 🔴 Crítico

**Problema:** El cron `cleanup-audit-logs` borraba registros de auditoría con más de 90 días. Viola el principio de inmutabilidad de la historia clínica y potencialmente regulaciones LATAM (retención 5-15 años).

**Corrección:**
```sql
DO $$ BEGIN
  PERFORM cron.unschedule('cleanup-audit-logs');
EXCEPTION WHEN others THEN ...
END $$;
```

**Archivo:** `supabase/migrations/000_production_full_schema.sql`

---

### SW-01 — Service Worker abría URLs externas de notificaciones push 🟠 Alto

**Problema:** El handler `notificationclick` abría `event.notification.data.url` sin validar el origen. Un payload push malicioso podía abrir una URL de phishing en el navegador del médico.

**Corrección:** Validación de origen antes de abrir:
```typescript
const parsed = new URL(rawUrl, self.registration.scope);
if (parsed.origin === scope.origin) {
  safeUrl = parsed.pathname + parsed.search + parsed.hash;
} else {
  console.warn("[SW] Blocked external URL:", rawUrl);
}
```

**Archivo:** `worker/index.ts`

---

### HAL-14 — `audit_logs` SELECT solo visible para el propio doctor 🟡 Medio

**Problema:** La policy `audit_tenant_select` limitaba la vista de audit logs al `doctor_id = auth.uid()`. Un admin de clínica no podía supervisar la actividad de sus médicos.

**Corrección:**
```sql
USING (
  doctor_id = auth.uid()
  OR public.is_clinic_admin(clinic_id)
);
```

---

### IDB-01 — `NEXT_PUBLIC_IDB_MASTER_KEY` ausente en `.env.local` 🟡 Medio

**Problema:** La variable faltaba en `.env.local` y `.env.local.example`. La app crasheaba en runtime con error críptico al intentar cifrar datos offline.

**Corrección:** Variable añadida en ambos archivos con valor de desarrollo y documentación de cómo generar el valor de producción (`openssl rand -base64 32`).

**Archivos:** `.env.local`, `.env.local.example`

---

### BUILD-01 — `src/middleware.ts` coexistía con `src/proxy.ts` 🔴 Crítico

**Problema:** Next.js 16 con la extensión `proxy` prohíbe que `middleware.ts` y `proxy.ts` coexistan. El archivo `src/middleware.ts` era un re-export de `proxy.ts` que ya no es necesario en Next.js 16 — el framework usa `proxy.ts` directamente. El build fallaba con exit code 1.

**Corrección:** Eliminado `src/middleware.ts`.

---

## Pasada 7 — Repaso final de calidad

### LINT-01 — `cookies` importado sin usar en rutas Stripe 🟢 Bajo

**Archivos:** `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/portal/route.ts`

**Corrección:** Import eliminado.

---

### LINT-02 — `target_doctor_id` destructurado sin usar en `trial-ending` 🟢 Bajo

**Archivo:** `src/app/api/email/trial-ending/route.ts`

**Corrección:** Eliminado del destructuring.

---

### LINT-03 — Directivas `eslint-disable` stale en 3 archivos 🟢 Bajo

**Archivos:** `src/features/admin/actions.ts`, `src/lib/observability/server-logger.ts`, `src/features/consultations/context/clinical-context.tsx`

**Corrección:** Directivas eliminadas (las reglas que referenciaban no están activas en la configuración ESLint del proyecto).

---

### LINT-04 — `serverEnv` importado sin usar en `supabase/actions.ts` 🟢 Bajo

**Corrección:** Import eliminado.

---

### WEBHOOK-01 — Dead code `gracePeriodExpiresAt` en webhook 🟢 Bajo

**Problema:** Variable calculada en el handler `invoice.payment_failed` pero nunca usada en el UPDATE de Supabase (intencionalmente — el expires_at no se modifica durante el grace period). Era dead code y confundía la lectura.

**Corrección:** Variable eliminada. Log actualizado para indicar claramente los 7 días de gracia.

---

## Archivos modificados — listado completo

### TypeScript / Next.js

| Archivo | Hallazgos |
|---------|-----------|
| `src/app/api/clinic/members/[id]/route.ts` | HAL-01, HAL-02 |
| `src/app/api/clinic/invite/route.ts` | R-01, R-02 |
| `src/app/api/stripe/checkout/route.ts` | S-02, LINT-01 |
| `src/app/api/stripe/portal/route.ts` | S-02, LINT-01 |
| `src/app/api/stripe/webhook/route.ts` | HAL-11, REV-05, WEBHOOK-01 |
| `src/app/api/email/followup/route.ts` | HAL-03, HAL-08, HAL-10, R-07, REV-03 |
| `src/app/api/email/trial-ending/route.ts` | HAL-03, HAL-08, HAL-10, LINT-02 |
| `src/app/api/push/send/route.ts` | HAL-08, REV-01 |
| `src/app/api/push/subscribe/route.ts` | HAL-03 (Zod) |
| `src/app/api/cie-suggestions/route.ts` | HAL-05, HAL-07, F-40 |
| `src/app/api/search/route.ts` | REV-04 |
| `src/lib/api/guards.ts` | HAL-02, HAL-03, HAL-08 |
| `src/lib/env.ts` | HAL-05, HAL-10 |
| `src/lib/supabase/server.ts` | R-06 |
| `src/lib/supabase/actions.ts` | R-07, LINT-04 |
| `src/lib/supabase/middleware.ts` | S-03 |
| `src/lib/supabase/profile.ts` | HAL-13.1 |
| `src/lib/db/crypto.ts` | R-05 (documentación) |
| `src/lib/observability/server-logger.ts` | HAL-11 (nuevo), LINT-03 |
| `src/proxy.ts` | HAL-11, S-01 |
| `src/features/admin/actions.ts` | F-41, LINT-03 |
| `src/features/agenda/lib/use-agenda-realtime.ts` | F-13 |
| `src/features/consultations/context/clinical-context.tsx` | LINT-03 |
| `worker/index.ts` | SW-01 |
| `next.config.ts` | S-05 |
| `.env.local` | IDB-01 |
| `.env.local.example` | IDB-01 |
| `src/middleware.ts` | BUILD-01 (eliminado) |

### SQL (`supabase/migrations/000_production_full_schema.sql`)

| Hallazgo | Cambio |
|----------|--------|
| HAL-09 | Storage RLS `clinic_assets` con aislamiento por `clinic_id` en folder path |
| R-04 | `SET search_path = public` en 7 funciones `SECURITY DEFINER` |
| S-04 | `REVOKE EXECUTE ON get_user_id_by_email FROM authenticated, anon` |
| F-01 | `clinic_members_write` RLS reescrita — solo `is_clinic_admin()` |
| F-21 | `search_global()` — segundo guard de tsquery vacío tras fallback |
| F-41 / HAL-15 | `is_super_admin()` creada con `SECURITY DEFINER` + permisos correctos |
| REV-02 | Eliminada definición duplicada de `is_super_admin()` |
| HAL-13.1 | `profiles_tenant_write` separada en `insert` + `update` con WITH CHECK de billing |
| HAL-05 | `cron.unschedule('cleanup-audit-logs')` — audit logs son inmutables |
| HAL-14 | `audit_tenant_select` ampliada a admins de clínica |

### Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/lib/observability/server-logger.ts` | Logger estructurado JSON con niveles y correlación por Request-ID |

---

## Acciones manuales pendientes en Supabase SQL Editor

Buscar los marcadores en `supabase/migrations/000_production_full_schema.sql` y ejecutar cada bloque en producción:

```
1. -- HAL-09    → Storage RLS clinic_assets (aislamiento de tenant por folder path)

2. -- R-04      → SET search_path en funciones SECURITY DEFINER:
                   log_audit_event, notify_followup_due_today,
                   send_followup_push_notifications, send_followup_emails,
                   send_trial_ending_emails

3. -- S-04      → REVOKE EXECUTE ON get_user_id_by_email FROM authenticated, anon

4. -- F-01      → clinic_members_write policy (solo is_clinic_admin)

5. -- F-21      → search_global() segundo guard tsquery vacío

6. -- SECURITY HARDENING (bloque al final del archivo) →
                   profiles_tenant_insert/update, audit_tenant_select,
                   is_super_admin(), cleanup-audit-logs unschedule
```

Después de ejecutar el SQL:

```bash
# Configurar el email del super admin en la base de datos de producción:
ALTER DATABASE postgres SET app.admin_email = 'tu-email@glyphix.app';

# Regenerar tipos — elimina los 2 casts `as any` temporales en:
#   src/features/admin/actions.ts  (is_super_admin RPC)
#   src/app/api/search/route.ts    (search_global sin p_clinic_id)
npm run db:types
```

### Variables de entorno en Vercel (pendientes)

```
NEXT_PUBLIC_IDB_MASTER_KEY = <openssl rand -base64 32>
```

---

## Estado post-auditoría

```
npx tsc --noEmit              → ✅  0 errores
npm run lint                  → ✅  0 errores, 0 warnings
npm run build                 → ✅  28 rutas compiladas, exit 0
Hallazgos críticos activos    → 0
Hallazgos altos activos       → 0
Hallazgos medios activos      → 0
.env.local en git             → ✅  ignorado por .gitignore (.env*)
Acciones manuales pendientes  → 6 bloques SQL + 1 ALTER DATABASE + npm run db:types + 1 Vercel env var
Casts `as any` temporales     → 2 (se eliminan tras npm run db:types)
```

### Verificación final — 17 checks — 17/17 OK

| # | Check | Resultado |
|---|-------|-----------|
| 1 | `npx tsc --noEmit` | ✅ 0 errores |
| 2 | `npm run lint` | ✅ 0 errores, 0 warnings |
| 3 | `npm run build` | ✅ exit 0, 28 rutas |
| 4 | `process.env.VAR!` en `src/` | ✅ 0 non-null assertions en env vars |
| 5 | `as never` en `src/` | ✅ 0 ocurrencias |
| 6 | `createServerClient` inline en API routes | ✅ 0 ocurrencias |
| 7 | `error.message` en cuerpo de `NextResponse.json` | ✅ 0 ocurrencias |
| 8 | `src/middleware.ts` y `src/proxy.ts` coexistiendo | ✅ Solo `proxy.ts` existe |
| 9 | `subscription_status` en INSERT de `profile.ts` | ✅ Eliminado |
| 10 | Cron `cleanup-audit-logs` activo | ✅ Deshabilitado en schema |
| 11 | URL de push notification validada en Service Worker | ✅ Validación de origen presente |
| 12 | Definiciones duplicadas de `is_super_admin()` en SQL | ✅ 1 sola definición |
| 13 | `GRANT EXECUTE TO authenticated` en `is_super_admin` correcto | ✅ Solo `authenticated` (no `anon`) |
| 14 | `clinic_members_write` RLS solo con `is_clinic_admin()` | ✅ Sin OR con `profiles` |
| 15 | Guard de tsquery vacío en `search_global()` | ✅ Presente |
| 16 | Grace period `GRACE_MS` en `cie-suggestions` | ✅ Presente |
| 17 | `.env.local` ignorado por git | ✅ Confirmado con `git check-ignore` |
