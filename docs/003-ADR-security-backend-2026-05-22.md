# ADR-003: Decisiones de Arquitectura de Seguridad — Auditoría Backend 2026-05-22

**Estado:** Aceptado  
**Fecha:** 2026-05-22  
**Autor:** Auditoría automatizada + revisión manual  
**Alcance:** API Routes · Supabase RLS · SQL functions · pg_cron · Realtime · Storage · Edge middleware · Headers HTTP · Admin Panel · Sync Engine · Service Worker · IndexedDB

---

## Contexto

Se realizó una auditoría de seguridad exhaustiva del backend de Glyphix HCE en **7 pasadas progresivas**. El sistema maneja PHI (Protected Health Information) de pacientes en un entorno SaaS multi-tenant, lo que eleva la criticidad de cada hallazgo.

**Resultado:** 50 hallazgos identificados y corregidos. Detalle completo en `docs/AUDITORIA_2026.md`.

---

## Decisiones de arquitectura adoptadas

### 1. Control de acceso entre tenants — principio "deny first" (HAL-01, F-01)

**Decisión:** Todas las operaciones mutantes de API que toquen recursos de una clínica deben verificar `assertIsClinicAdmin()` **antes** de consultar o modificar datos. Igualmente, las políticas RLS de `clinic_members` solo deben usar `is_clinic_admin()` sin OR adicionales que puedan bypassear el check.

**Patrón obligatorio:**
```typescript
// ✅ API Route — antes de cualquier operación
await assertIsClinicAdmin(supabase, user.id, clinic_id);
```
```sql
-- ✅ RLS — sin OR que permita auto-escalada
USING (public.is_clinic_admin(public.clinic_members.clinic_id))
WITH CHECK (public.is_clinic_admin(public.clinic_members.clinic_id))
```

**Anti-patrón prohibido:**
```sql
-- ❌ El OR permite a cualquier miembro con perfil modificar el roster
USING (is_clinic_admin(clinic_id) OR exists (select 1 from profiles where doctor_id = auth.uid()))
```

---

### 2. Sanitización de errores hacia el cliente (HAL-02, R-01, R-02)

**Decisión:** Ningún `error.message` de Supabase, PostgreSQL o errores de JavaScript puede incluirse en el body de una respuesta HTTP al cliente en producción.

**Implementación:** `sanitizeDbError(error)` en `src/lib/api/guards.ts` — devuelve un string genérico en producción, el mensaje real solo en `development`. El error real siempre se loguea internamente via `serverLog`.

```typescript
// ✅
return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
// ❌
return NextResponse.json({ error: err.message }, { status: 500 });
```

---

### 3. Comparación de secretos en tiempo constante (HAL-08)

**Decisión:** Toda comparación de secrets de headers (`x-push-secret`, `x-email-secret`, etc.) debe usar `isSecretValid()` con `crypto.timingSafeEqual`. Nunca `===`.

**Archivo:** `src/lib/api/guards.ts`

---

### 4. Storage con aislamiento estricto de tenant (HAL-09)

**Decisión:** El bucket `clinic_assets` requiere que el primer segmento del path del objeto sea el `clinic_id` del usuario autenticado. Convención de path obligatoria: `clinic_assets/{clinic_id}/filename.ext`.

```sql
AND (storage.foldername(name))[1] IN (
  SELECT clinic_id::text FROM public.profiles WHERE doctor_id = auth.uid()
  UNION
  SELECT clinic_id::text FROM public.clinic_members WHERE doctor_id = auth.uid()
)
```

---

### 5. `SET search_path` obligatorio en `SECURITY DEFINER` (R-04)

**Decisión:** Toda función con `SECURITY DEFINER` debe incluir `SET search_path = public` para prevenir schema path injection. Esto es un requisito de seguridad no negociable en PostgreSQL multi-tenant.

**Funciones afectadas:** `log_audit_event`, `notify_followup_due_today`, `send_followup_push_notifications`, `send_followup_emails`, `send_trial_ending_emails`, `is_super_admin`, `search_global`, `is_clinic_admin`, `is_clinic_member`.

---

### 6. REVOKE de funciones privilegiadas (S-04, F-41)

**Decisión:** Las funciones que operan sobre `auth.users` o verifican roles administrativos deben estar revocadas para el rol `anon` y solo accesibles por los roles mínimos necesarios:

| Función | authenticated | anon | service_role |
|---------|:---:|:---:|:---:|
| `get_user_id_by_email` | ❌ REVOKE | ❌ REVOKE | ✅ |
| `is_super_admin` | ✅ (verifica uid internamente) | ❌ REVOKE | ✅ |
| `is_clinic_admin` | ✅ | ❌ | ✅ |
| `is_clinic_member` | ✅ | ❌ | ✅ |

---

### 7. Observabilidad estructurada con correlación de Request-ID (HAL-11, S-01)

**Decisión:** Todo log de servidor usa `serverLog` de `src/lib/observability/server-logger.ts`. El proxy inyecta `X-Request-ID` (usando `new Headers(request.headers)` — la API correcta del Edge runtime) y todos los API routes lo propagan via `serverLog.withRequestId()`.

```typescript
const log = serverLog.withRequestId(req.headers.get("x-request-id") ?? "");
log.critical("stripe:webhook", "fallo crítico", { error, customerId });
```

---

### 8. Cliente Supabase centralizado — un único punto de creación (R-06, R-07, S-02, S-03)

**Decisión:** Todo el código debe importar `createClient()` y `createAdminClient()` desde `@/lib/supabase/server`. Ningún archivo puede instanciar `createServerClient` o `createClient(@supabase/supabase-js)` inline, excepto en `stripe/webhook/route.ts` donde las tablas no están en los tipos generados aún.

---

### 9. Trial asignado solo por `service_role` — nunca desde el cliente (HAL-13.1)

**Decisión:** El estado de suscripción (`subscription_status`, `subscription_expires_at`, `stripe_customer_id`) solo puede ser asignado por:
1. `createTenantProfileWithTrial()` — Server Action con `service_role`
2. El webhook de Stripe — API Route con `service_role`

La RLS de `profiles_tenant_insert` bloquea estos campos con `WITH CHECK (subscription_status IS NULL AND subscription_expires_at IS NULL AND stripe_customer_id IS NULL)`.

---

### 10. Audit logs son inmutables — sin cron de limpieza (HAL-05 cron)

**Decisión:** El cron job `cleanup-audit-logs` ha sido deshabilitado. Los registros de auditoría clínica deben retenerse indefinidamente (regulaciones LATAM exigen entre 5 y 15 años). Si el volumen de storage se vuelve un problema, migrar a cold storage pero nunca eliminar.

---

### 11. Validación de origen en notificaciones push (SW-01)

**Decisión:** El Service Worker valida el origen de todas las URLs abiertas vía `notificationclick`. Solo se abren URLs del mismo origen que `self.registration.scope`. Las URLs externas se bloquean con `console.warn`.

---

### 12. Separación clara de rutas públicas/privadas en proxy (H-4)

**Decisión:** Allowlist explícita de rutas públicas en `src/lib/supabase/middleware.ts`. Toda ruta nueva queda protegida automáticamente sin tener que modificar la lista. Anti-patrón rechazado: blocklist de rutas privadas (nueva ruta = vulnerabilidad por omisión).

---

### 13. Grace period diferenciado por estado de suscripción (F-40)

**Decisión:** El control de acceso a Gemini/CIE diferencia por estado:
- `active` / `trialing`: sin grace period — acceso inmediato si expires_at > now
- `past_due`: 7 días de grace period (ventana de reintentos de Stripe)
- `paused`: sin grace period — suscripción pausada = acceso revocado

---

### 14. `is_super_admin()` via RPC con fallback documentado (F-41)

**Decisión:** La verificación de super admin usa la función SQL `is_super_admin()` como fuente primaria (verifica contra `auth.users` con `app.admin_email` de la DB config). El fallback de `ADMIN_EMAIL` por env var se mantiene como segunda línea de defensa con `console.warn` explícito para facilitar la migración.

---

## Acción manual requerida en Supabase SQL Editor

| Fix | Marcador en `000_production_full_schema.sql` |
|-----|---------------------------------------------|
| Storage RLS con aislamiento de tenant | `-- HAL-09` |
| `SET search_path` en funciones SECURITY DEFINER | `-- R-04` |
| REVOKE en `get_user_id_by_email` | `-- S-04` |
| `clinic_members_write` RLS corregida | `-- F-01` |
| `search_global()` guard tsquery vacío | `-- F-21` |
| Bloque completo SECURITY HARDENING | `-- SECURITY HARDENING — Auditoría 2026-05-22` |

Después del SQL:
```sql
ALTER DATABASE postgres SET app.admin_email = 'tu-email@glyphix.app';
```
```bash
npm run db:types   # elimina los 2 casts `as any` temporales
```

---

## Estado de verificación

```
npx tsc --noEmit   → ✅  0 errores
npm run lint       → ✅  0 errores, 0 warnings
npm run build      → ✅  28 rutas compiladas, exit 0
.env.local en git  → ✅  ignorado (.gitignore línea 40: .env*)
```
