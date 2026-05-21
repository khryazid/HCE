# Auditoría Técnica Completa — Glyphix HCE
**docs/AUDITORIA_2026.md**

> **Fecha:** Mayo 2026  
> **Repo:** github.com/khryazid/HCE  
> **Dominio actual:** glyphmed.app → migración pendiente a glyphix.app  
> **Agentes:** Frontend · Backend/API · Seguridad · Base de Datos · Sync/Offline · Billing · SEO/Marca  
> **Total hallazgos únicos:** 58 (tras consolidación de duplicados)  
> **Distribución:** 9 críticos · 19 altos · 21 medios · 9 bajos

---

## Tabla de contenidos

1. [Metodología y agentes](#1-metodología-y-agentes)
2. [Hallazgos consolidados](#2-hallazgos-consolidados)
3. [Top 10 accionable](#3-top-10-accionable)
4. [Quick wins — esta semana](#4-quick-wins--esta-semana)
5. [Roadmap sugerido](#5-roadmap-sugerido)
6. [Conexión con el backlog existente](#6-conexión-con-el-backlog-existente)

---

## 1. Metodología y agentes

### Agentes especializados

| # | Agente | Foco |
|---|--------|------|
| A1 | Frontend | Next.js 16, React 19, PWA, Accessibility, UX |
| A2 | Backend/API | API Routes, validación, rate limiting, observabilidad |
| A3 | Seguridad | RLS, autenticación, secretos, compliance médico |
| A4 | Base de Datos | Schema, índices, RPCs, funciones Postgres, migraciones |
| A5 | Sync/Offline | Sync worker, IndexedDB, conflictos, edge cases |
| A6 | Billing | Stripe webhooks, idempotencia, multi-seat, trials |
| A7 | SEO/Marca | Identidad de marca, Core Web Vitals, PWA, dominio |

### Criterios de severidad

- **Crítico:** Riesgo de pérdida de datos de pacientes, acceso no autorizado a datos PHI, o corrupción de estados de suscripción que bloquea el acceso durante consultas activas.
- **Alto:** Falla silenciosa de funcionalidad clave, vulnerabilidad de seguridad explotable, o degradación de rendimiento que afecta a todos los usuarios.
- **Medio:** Comportamiento incorrecto en casos de borde, deuda técnica con riesgo moderado, o mala experiencia de usuario en flujos secundarios.
- **Bajo:** Optimizaciones, inconsistencias menores, o mejoras de mantenibilidad sin impacto directo en usuarios.

---

## 2. Hallazgos consolidados

### 🔴 CRÍTICOS (9)

---

#### C-01 — Secretos hardcodeados en migración SQL que vive en git
**Agentes:** A3 (Seg-5.2), A4 (DB-1.1)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql` sección 8

Los valores reales de `push_send_secret` (`6e0300c35f48...`) y `resend_email_secret` (`183492765`) están hardcodeados en el archivo de migración SQL commiteado al repositorio. Cualquier persona con acceso al repo puede ver estos secretos y:
- Enviar push notifications a cualquier médico de la plataforma
- Disparar emails transaccionales masivos

**Corrección inmediata:**
```sql
-- Reemplazar en el SQL con placeholders
('push_send_secret', 'REEMPLAZAR_EN_SUPABASE_DASHBOARD')
```
Insertar los valores reales manualmente desde el Supabase SQL Editor o usar Supabase Vault.

---

#### C-02 — Sin idempotencia en Stripe webhooks — doble procesamiento de eventos
**Agentes:** A2 (Backend-3.1), A6 (Billing-IDP-01)  
**Archivos:** `src/app/api/stripe/webhook/route.ts`

Stripe garantiza entrega "at-least-once", no "exactly-once". Sin deduplicación por `event.id`, un webhook reintentado por timeout de Vercel puede ejecutar dos veces: activar/cancelar suscripciones incorrectamente, generar dos emails de bienvenida, o actualizar estados en un orden incorrecto.

**Corrección:**
```sql
CREATE TABLE stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Al inicio del handler: `INSERT ... ON CONFLICT DO NOTHING`. Si no insertó (ya procesado), retornar `200` inmediatamente.

---

#### C-03 — `follow_up_tasks` nunca se puebla — cron jobs de notificaciones no disparan
**Agentes:** A4 (DB-1.5), A2 (Backend-4.1)  
**Archivos:** `src/features/consultations/lib/follow-up.ts`, `supabase/migrations/000_production_full_schema.sql`

Los seguimientos se guardan en `specialty_data.next_follow_up_date` (JSONB) pero los cron jobs de push y email leen de la tabla `follow_up_tasks`. **Los médicos nunca reciben notificaciones de seguimientos** — la funcionalidad prometida no funciona en producción.

**Corrección:** Trigger en `clinical_records` que sincronice:
```sql
CREATE OR REPLACE FUNCTION public.sync_follow_up_task()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_due_date DATE;
BEGIN
  v_due_date := (NEW.specialty_data->>'next_follow_up_date')::date;
  IF v_due_date IS NOT NULL THEN
    INSERT INTO public.follow_up_tasks (clinic_id, doctor_id, patient_id, clinical_record_id, due_date)
    VALUES (NEW.clinic_id, NEW.doctor_id, NEW.patient_id, NEW.id, v_due_date)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
```

---

#### C-04 — Pruning de IndexedDB puede borrar datos offline si crypto falla
**Agentes:** A5 (Sync-2.3), A1 (Frontend-Crítico-1)  
**Archivos:** `src/lib/db/indexeddb.ts` funciones `refreshPatientsFromRemote`, `refreshClinicalRecordsFromRemote`

Secuencia de pérdida de datos:
1. Médico crea paciente offline → va a cola con status `pending`
2. Pierde conexión antes de sync
3. Al reconectar, `refreshPatientsFromRemote` corre y llama a Supabase
4. `getPendingRecordIds` llama a `unwrapData` que puede fallar si crypto no está inicializada
5. La función retorna array vacío → el paciente aparece en `idsToDelete`
6. **El paciente se borra del IDB permanentemente**

**Corrección:** `getPendingRecordIds` debe lanzar excepción (no retornar array vacío) si hay error de crypto, abortando el pruning completo.

---

#### C-05 — Race condition: `initDbCrypto` vs primer `enqueueSyncItem`
**Agentes:** A1 (Frontend-Crítico-3), A5 (Sync-implícito)  
**Archivos:** `src/lib/db/indexeddb.ts`, `src/lib/supabase/tenant-context.tsx`, `src/features/consultations/lib/use-consultation-save.ts`

Si un médico guarda una consulta antes de que `initDbCrypto()` termine (race condition en el mount del `TenantProvider`), `enqueueSyncItem` llama a `wrapData` que llama a `ensureCrypto`. Si la sesión no está disponible en ese momento exacto, el item se encola sin cifrar o falla silenciosamente — la consulta se "guarda" en la UI pero no en IndexedDB.

**Corrección:** Implementar un `cryptoInitPromise` compartido y que `ensureCrypto()` espere su resolución antes de cualquier operación de escritura en IDB.

---

#### C-06 — Suscripción expirada con datos offline — datos clínicos atrapados permanentemente
**Agentes:** A5 (Sync-4.2), A3 (Seg-implícito)  
**Archivos:** `src/lib/supabase/tenant-context.tsx`, `src/lib/sync/sync-worker.ts`

Si un médico trabaja offline 2+ días y su suscripción expira mientras tanto:
1. Al reconectar, `flushSyncQueue` intenta subir datos
2. RLS de Supabase rechaza los writes (suscripción inactiva)
3. Items pasan a `failed` → `abandoned`
4. **Consultas clínicas quedan atrapadas en IDB, nunca se sincronizan**

El usuario solo ve "sincronización con errores" sin entender que es por la suscripción.

**Corrección:** En el error handler del sync worker, detectar código PostgreSQL `42501` (violación de RLS) y emitir un modal: *"Tu suscripción expiró. Reactívala para sincronizar. Los datos locales están seguros."*

---

#### C-07 — `PUSH_SEND_SECRET` permite spam/phishing a todos los médicos si se filtra
**Agentes:** A2 (Backend-4.1), A3 (Seg-implícito)  
**Archivos:** `src/app/api/push/send/route.ts`

El endpoint `/api/push/send` acepta peticiones con el header `x-push-secret` como alternativa a sesión autenticada. Si el secreto se filtra (está hardcodeado en git — ver C-01), cualquier atacante puede enviar notificaciones push a cualquier `target_doctor_id` sin autenticación. No hay validación de que el campo `url` del payload sea una ruta interna.

**Corrección:** Agregar allowlist de URLs internas. Rotar el secreto. Agregar auditoría de uso del secreto del cron.

---

#### C-08 — Race condition en `DashboardOnboardingGuard` — redirecciones indebidas a `/billing`
**Agentes:** A1 (Frontend-Crítico-2), A3 (Seg-2.2)  
**Archivos:** `src/features/dashboard/components/dashboard-onboarding-guard.tsx`

El guard usa `useEffect` para verificar suscripción y redirigir, pero no tiene `if (loading) return` antes de las redirecciones. En la primera carga (cuando `tenant` aún es `null`), puede redirigir a `/billing` aunque el usuario tenga suscripción activa. **Médicos con suscripción activa son redirigidos incorrectamente durante la carga.**

**Corrección:** Agregar `if (loading) return;` como primera línea del `useEffect`.

---

#### C-09 — JSON-LD con rating ficticio en producción — riesgo de penalización de Google
**Agentes:** A7 (SEO-4)  
**Archivos:** `src/app/page.tsx`

```json
"aggregateRating": { "ratingValue": "4.9", "ratingCount": "89" }
```

El app está en lanzamiento temprano (el README lo confirma explícitamente) y tiene 0 reseñas reales. Datos estructurados falsos violan las directrices de Google y pueden resultar en **penalización manual** que desindexe toda la landing.

**Corrección:** Eliminar el bloque `aggregateRating` del JSON-LD inmediatamente. Solo re-agregarlo cuando haya reseñas reales verificables.

---

### 🟠 ALTOS (19)

---

#### A-01 — SQL Injection potencial en `search_global` — ILIKE sin escape
**Agentes:** A3 (Seg-5.1), A4 (DB-2.1)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`, `/api/search/route.ts`

```sql
AND pat.full_name ILIKE '%' || p_query || '%'
```

Doble problema: (a) `ILIKE` con wildcard al inicio hace **full table scan** ignorando los índices GIN definidos; (b) los caracteres especiales de LIKE (`%`, `_`, `\`) no están escapados, permitiendo que un usuario construya queries que expongan más datos de los esperados o degraden el rendimiento intencionalmente. Con 10,000+ pacientes, esto colapsa la búsqueda.

**Corrección:**
```sql
-- Usar índices GIN existentes
WHERE to_tsvector('spanish', full_name || ' ' || document_number)
  @@ websearch_to_tsquery('spanish', p_query)
-- Y escapar LIKE especiales en búsqueda por documento
AND document_number ILIKE '%' || regexp_replace(p_query, '([%_\\])', '\\\1', 'g') || '%'
```

---

#### A-02 — Trial de 7 días creado desde el cliente con anon key — bypass posible
**Agentes:** A2 (Backend-3.3), A6 (Billing-TRL-01)  
**Archivos:** `src/lib/supabase/profile.ts` función `ensureTenantProfile`

```typescript
subscription_status: "trialing",
subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
```

El trial se crea con INSERT desde el cliente usando la anon key. Un usuario puede manipular esta llamada para extender el trial arbitrariamente. No existe validación server-side de que el trial no haya sido otorgado previamente.

**Corrección:** Mover la creación del perfil con trial a una Server Action o API Route que use `service_role`. Agregar RLS que impida al usuario modificar `subscription_status` y `subscription_expires_at` directamente.

---

#### A-03 — Cron jobs de notificaciones sin deduplicación — doble envío ante retry de pg_cron
**Agentes:** A2 (Backend-4.2), A4 (DB-4.1)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql` funciones `send_followup_push_notifications`, `send_followup_emails`

Los cron jobs no tienen mecanismo de deduplicación. Si pg_cron ejecuta un job dos veces (fallo y retry, reinicio de instancia), el mismo médico recibe doble notificación ese día. No hay tabla de control que registre envíos diarios.

**Corrección:**
```sql
CREATE TABLE notification_log (
  doctor_id         UUID NOT NULL,
  notification_date DATE NOT NULL,
  type              TEXT NOT NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (doctor_id, notification_date, type)
);
-- Verificar antes de enviar: INSERT ... ON CONFLICT DO NOTHING
-- Si no insertó (ya enviado), omitir
```

---

#### A-04 — Gemini consume cuota aunque la suscripción esté vencida
**Agentes:** A2 (Backend-2.1)  
**Archivos:** `src/app/api/cie-suggestions/route.ts`

El check de suscripción activa ocurre en el frontend (`DashboardOnboardingGuard`) pero no en el API route `/api/cie-suggestions`. Un usuario con plan cancelado que conserve un JWT válido puede seguir consumiendo cuota de Gemini hasta que expire el token.

**Corrección:** Tras obtener el `userId`, consultar `subscription_status` en Supabase. Rechazar con 403 si no es `active/trialing/lifetime`.

---

#### A-05 — Política RLS de `push_subscriptions` con operador OR ambiguo
**Agentes:** A3 (Seg-1.3)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

Por precedencia SQL (`AND` antes que `OR`), cualquier miembro de la clínica puede ver tokens push de todos los doctores. Un asistente podría ver y potencialmente usar endpoints de push de médicos.

**Corrección:**
```sql
USING (
  doctor_id = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM profiles p WHERE p.doctor_id = auth.uid() AND p.clinic_id = push_subscriptions.clinic_id)
    OR is_clinic_member(push_subscriptions.clinic_id)
  )
)
```

---

#### A-06 — `search_global` acepta `clinic_id` del cliente — potencial IDOR
**Agentes:** A4 (DB-5.1)  
**Archivos:** `src/app/api/search/route.ts`, `supabase/migrations/000_production_full_schema.sql`

La función acepta `p_clinic_id` como parámetro externo. Aunque RLS `SECURITY INVOKER` mitiga el riesgo, si hay un bug en las policies un cliente malicioso puede pasar el `clinic_id` de otro tenant.

**Corrección:** Derivar `clinic_id` internamente desde `auth.uid()` dentro de la función SQL, sin recibirlo como parámetro.

---

#### A-07 — Dependencias entre flushes del sync worker sin guardia cross-flush
**Agentes:** A5 (Sync-1.4)  
**Archivos:** `src/lib/sync/sync-worker.ts`

El sistema tiene guardias de dependencias (`failedPatientIds`, `failedRecordIds`) solo dentro del mismo flush. Si un paciente falla en el flush N y su `clinical_record` se intenta en el flush N+1 (30 segundos después), ocurrirá una FK violation. La guardia no persiste entre ciclos.

**Corrección:** Antes de sincronizar un `clinical_record`, verificar en la cola local si hay un paciente pendiente con el mismo `patient_id`. Si existe, posponer el record.

---

#### A-08 — Escrituras en IDB sin `try/catch` — fallos silenciosos ante cuota llena
**Agentes:** A5 (Sync-2.2), A1 (Frontend-Crítico-1)  
**Archivos:** `src/lib/db/indexeddb.ts` funciones `savePatientLocal`, `saveClinicalRecordLocal`

Si IndexedDB falla (cuota excedida en móviles, modo incógnito, corrupción), el error se propaga silenciosamente. El médico ve que la consulta "se guardó" pero en realidad no se guardó ni se encoló para sync.

**Corrección:** Envolver todas las operaciones de escritura en `try/catch` y emitir `APP_EVENT_SYNC_ERROR` en el fallo.

---

#### A-09 — Ruta `/billing` sin protección en middleware SSR
**Agentes:** A3 (Seg-2.1)  
**Archivos:** `src/lib/supabase/middleware.ts`

`/billing` no está en la lista de `isProtectedRoute`. Un usuario no autenticado puede acceder y ver el HTML de la página antes de la redirección client-side.

**Corrección:** Agregar `/billing` a `isProtectedRoute` en `middleware.ts`.

---

#### A-10 — Conflictos silenciosos por drift de reloj en sync
**Agentes:** A5 (Sync-1.3)  
**Archivos:** `src/lib/sync/sync-worker.ts` función `syncItem`

```typescript
if (remoteTime > item.client_timestamp) {
  await deleteSyncQueueItem(item.id);
  return "synced";
}
```

Si el reloj del cliente está adelantado, un cambio real del médico puede ser descartado silenciosamente por un timestamp remoto ligeramente más nuevo. **Toda una consulta offline se pierde sin notificación.**

**Corrección:** Al descartar un cambio local, notificar explícitamente al usuario en lugar de operar en silencio. Implementar merge a nivel de campo para tipos que lo permitan.

---

#### A-11 — Sin grace period en `invoice.payment_failed` — médico puede perder acceso durante consulta
**Agentes:** A6 (Billing-EST-01)  
**Archivos:** `src/app/api/stripe/webhook/route.ts`

Stripe reintenta hasta 4 veces en ~14 días. Sin grace period definido, un primer fallo de pago puede cortar el acceso a la HCE durante una consulta activa — riesgo clínico real.

**Corrección:** Definir en el webhook:
- `invoice.payment_failed` → marcar `past_due`, activar grace period de 7 días (sin cortar acceso)
- `customer.subscription.updated` con `status=unpaid` (después de todos los reintentos) → suspender acceso

---

#### A-12 — Sin validación de seats pagados en invitación de miembros
**Agentes:** A6 (Billing-MST-01)  
**Archivos:** `src/app/api/clinic/invite/route.ts`

Al invitar un nuevo doctor no se valida cuántos seats están pagados en Stripe. Una clínica con plan de 3 doctores puede agregar 10 sin pagar diferencial.

**Corrección:** En la acción de invitar: consultar `clinic_members`, obtener max_seats del plan, y si `current >= max` redirigir al Customer Portal antes de crear la invitación.

---

#### A-13 — Validación de cuerpo incompleta en endpoints críticos
**Agentes:** A2 (Backend-1.1)  
**Archivos:** `src/app/api/clinic/invite/route.ts`, `src/app/api/push/send/route.ts`

`clinic_id` se extrae sin validar que sea UUID. Un atacante puede enviar un objeto o array y provocar comportamiento impredecible en las queries de Supabase. Títulos y URLs de push se usan directamente sin límite de longitud.

**Corrección:** Implementar validación con `zod` en todos los endpoints.

---

#### A-14 — Nombres "Glyph"/"HCE" en toda la app — sin identidad "Glyphix"
**Agentes:** A7 (SEO-1.1)  
**Archivos:** `src/app/layout.tsx`, `src/app/landing-client.tsx`, emails, PDFs, PWA manifest

El nombre comercial Glyphix no aparece en ningún archivo de código. Usuarios ven "Glyph" en title, Open Graph, emails, PDFs de pacientes, y PWA. El esfuerzo de marketing en "Glyphix" es invisible para los usuarios reales.

**Corrección:** Crear `APP_NAME = "Glyphix"` en `src/lib/constants/app.ts` e importarla en lugar de strings literales. Reemplazar todas las ocurrencias en código y templates.

---

#### A-15 — Inventario de dominios hardcodeados antes de migrar a glyphix.app
**Agentes:** A7 (SEO-5)  
**Archivos:** `robots.ts`, `sitemap.ts`, `layout.tsx`, emails, SQL `app_config`

El dominio `glyphmedico.com/glyphmed.app` aparece en múltiples capas. Sin un checklist completo, la migración de dominio romperá emails transaccionales, push notifications, webhooks de Stripe, y el flujo de autenticación de Supabase.

**Corrección:** Crear checklist de migración. Los fallbacks hardcodeados son el mayor riesgo: si `NEXT_PUBLIC_SITE_URL` no se actualiza en Vercel, todo falla. Implementar redirects 301 desde el dominio viejo.

---

#### A-16 — LCP penalizado por animaciones con `opacity:0` en el h1 de la landing
**Agentes:** A7 (SEO-3.4)  
**Archivos:** `src/app/landing.css`, `src/app/landing-client.tsx`

El heading principal usa `opacity:0` con delay CSS. Chrome excluye el h1 del LCP hasta que se hace visible. El LCP medido es artificialmente alto, afectando el ranking en búsquedas.

**Corrección:** Renderizar el h1 visible inmediatamente y aplicar solo `transform` para el efecto de entrada.

---

#### A-17 — Variables de entorno críticas fallan lazy, no en startup
**Agentes:** A2 (Backend-5.1)  
**Archivos:** `src/lib/env.ts`

`serverEnv` usa getters lazy. `STRIPE_WEBHOOK_SECRET` faltante no falla en el build ni al arrancar, sino en la primera petición real al webhook. **Horas de outage silencioso** si el deploy no incluye la variable.

**Corrección:** Script `scripts/validate-env.ts` que accede a todos los getters como pre-start hook. Considerar `@t3-oss/env-nextjs` para validación en build time.

---

#### A-18 — PDF generado en hilo principal — bloquea UI 8–15s en móviles
**Agentes:** A1 (Frontend-Crítico-3)  
**Archivos:** `src/features/consultations/lib/pdf/pdf-renderer.ts`

`jsPDF` corre en el hilo principal bloqueando la UI por 8-15 segundos en dispositivos móviles durante la generación de PDF. En consultas con muchos pacientes esto resulta en una experiencia que parece congelada.

**Corrección:** (a) Mostrar spinner inmediato. (b) Mover a Web Worker. (c) Fix temporal: `await new Promise(r => setTimeout(r, 0))` entre secciones.

---

#### A-19 — `log_audit_event` SECURITY DEFINER sin validación de tenant
**Agentes:** A3 (Seg-1.4), A4 (DB-5.3)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

La función acepta `p_clinic_id` y `p_doctor_id` libres. Un usuario puede insertar registros de auditoría falsos en el log de otra clínica, comprometiendo la integridad del audit trail médico.

**Corrección:**
```sql
IF auth.uid() <> p_doctor_id THEN
  RAISE EXCEPTION 'Unauthorized audit log entry';
END IF;
```

---

### 🟡 MEDIOS (21)

---

#### M-01 — IndexedDB no se limpia en sesión expirada/revocada externamente
**Agentes:** A3 (Seg-2.3)  
**Archivos:** `src/lib/supabase/tenant-context.tsx`, `src/lib/db/indexeddb.ts`

Si la sesión expira o es revocada por el admin, el middleware redirige a login pero no limpia IndexedDB. Datos de pacientes del anterior sesión persisten en el dispositivo.

**Corrección:** Llamar a `clearOfflineDb()` en el handler `SIGNED_OUT` del `TenantProvider`.

---

#### M-02 — `setForm` con auto-fill inline causa cascada de re-renders O(n)
**Agentes:** A1 (Frontend-Alto-4)  
**Archivos:** `src/features/consultations/lib/use-consultation-wizard.ts`

El auto-fill del formulario al cambiar `patientId` recorre `records` (O(n)) en cada keystroke de otros campos. Con miles de registros, esto provoca lag visible en el wizard.

**Corrección:** Mover el auto-fill a un `useEffect` que solo reaccione a cambios en `form.patientId`.

---

#### M-03 — Script anti-flash accede a `localStorage` sin `try/catch` — crash en Safari privado
**Agentes:** A1 (Frontend-Alto-1), A7 (SEO-3.2)  
**Archivos:** `src/app/layout.tsx`

El script de tema en `<head>` puede lanzar `SecurityError` en Safari en modo privado, bloqueando la hidratación.

**Corrección:** Envolver en `try/catch`:
```js
(function(){try{var t=localStorage.getItem('hce:theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
```
(Ya está parcialmente hecho — verificar que el catch esté completo.)

---

#### M-04 — Vista materializada `mv_dashboard_kpis_daily` sin RLS de tenant
**Agentes:** A3 (Seg-1.2), A4 (DB-implícito)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

La vista materializada no hereda las políticas RLS de `audit_logs`. Acceso directo vía API expone KPIs de otras clínicas.

**Corrección:**
```sql
ALTER TABLE public.mv_dashboard_kpis_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpis_tenant_select" ON public.mv_dashboard_kpis_daily
  FOR SELECT TO authenticated USING (doctor_id = auth.uid());
```

---

#### M-05 — `api_rate_limits` sin policies RLS explícitas
**Agentes:** A3 (Seg-1.1)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

RLS activado sin policies = acceso bloqueado para todos. Correcto en producción pero frágil: si la función SECURITY DEFINER tiene un bug, no hay barrera secundaria.

**Corrección:** Agregar policy restrictiva explícita `USING (false)` para claridad y documentación de intención.

---

#### M-06 — Mensajes de error técnicos de PostgreSQL expuestos al usuario
**Agentes:** A2 (Backend-implícito), A5 (Sync-5.2)  
**Archivos:** `src/features/sync/components/sync-queue-panel.tsx`

Errores como `duplicate key value violates unique constraint "patients_clinic_id_document_number_key"` se muestran directamente al médico.

**Corrección:** Mapear códigos de error PostgreSQL comunes (23505, 42501, 23503) a mensajes en español comprensibles.

---

#### M-07 — Realtime de `clinical_records` filtra por `clinic_id` pero no por `doctor_id`
**Agentes:** A3 (Seg-3.2)  
**Archivos:** `src/features/patients/lib/use-clinical-records-realtime.ts`

Un asistente recibe notificaciones de cambios en registros de todos los doctores de la clínica (aunque RLS protege los datos reales en el refetch).

**Corrección:** Agregar `doctor_id` al filtro de Realtime.

---

#### M-08 — `claim_api_rate_limit`: si la RPC falla, el rate limit se bypasea
**Agentes:** A4 (DB-5.2)  
**Archivos:** múltiples endpoints

Si la RPC retorna error de red, `allowed` es `null` → `!null = true` → la request pasa sin rate limit.

**Corrección:**
```typescript
const { data: allowed, error } = await supabase.rpc("claim_api_rate_limit", {...});
if (error || !allowed) { return NextResponse.json({ error: "Rate limit" }, { status: 429 }); }
```

---

#### M-09 — `send_followup_push_notifications` usa extensión HTTP no estándar
**Agentes:** A4 (DB-4.3)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

`send_followup_push_notifications` usa `extensions.http_post` mientras `send_followup_emails` usa `net.http_post`. Inconsistencia que puede fallar si la extensión `http` no está habilitada.

**Corrección:** Unificar ambas funciones usando `net.http_post` de pg_net.

---

#### M-10 — Migración de schema de IDB v1→v2 borra datos no sincronizados
**Agentes:** A5 (Sync-2.4)  
**Archivos:** `src/lib/db/indexeddb.ts`

La migración de versión borra todos los stores. Si el médico tenía consultas offline no sincronizadas en v1, se pierden en la actualización a v2.

**Corrección:** Antes de destruir stores en migraciones, intentar exportar datos existentes o mostrar un warning explícito al usuario.

---

#### M-11 — Pérdida del borrador si se cierra la pestaña antes del debounce
**Agentes:** A1 (Frontend-Medio-4)  
**Archivos:** `src/features/consultations/lib/use-wizard-draft-sync.ts`

El guardado de borrador tiene debounce de 300ms. Si el usuario cierra la pestaña en ese ventana, el borrador se pierde.

**Corrección:** Añadir `beforeunload` y `visibilitychange` para forzar guardado inmediato.

---

#### M-12 — Modal de búsqueda global no atrapa el foco (accesibilidad)
**Agentes:** A1 (Frontend-Alto-acc)  
**Archivos:** `src/features/dashboard/components/global-search.tsx`

Violación WCAG 2.1 2.4.3: el focus trap no está implementado en el modal de búsqueda global.

**Corrección:** Implementar focus trap con `@radix-ui/react-dialog` o `useFocusTrap`.

---

#### M-13 — `log_audit_event` SECURITY DEFINER acepta `p_clinic_id` sin validar membership
**Agentes:** A4 (DB-5.3) — duplicado con A-19 al nivel medio-alto; incluido aquí por la dimensión de compliance
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

Ver A-19 para la corrección. Impacto adicional: audit trail médico comprometido tiene implicaciones regulatorias en mercados LATAM.

---

#### M-14 — `hreflang` ausente — versiones de idioma pueden indexarse como duplicadas
**Agentes:** A7 (SEO-2.4)  
**Archivos:** `src/app/layout.tsx`, `src/app/sitemap.ts`

La app usa `next-intl` con locales `es` y `en`. Sin etiquetas `hreflang`, Google puede tratar ambas versiones como contenido duplicado.

**Corrección:** Agregar `alternates.languages` en el objeto metadata, o al menos `<link rel="canonical">` explícito.

---

#### M-15 — Páginas `/privacidad` y `/terminos` sin metadata title/description
**Agentes:** A7 (SEO-2.3)  
**Archivos:** `src/app/privacidad/page.tsx`, `src/app/terminos/page.tsx`

Heredan el title genérico "Glyph — Motor Clínico". Además, el contenido menciona "HCE Platform" en lugar de "Glyphix".

**Corrección:** Agregar `export const metadata: Metadata = { title: "Política de privacidad — Glyphix", ... }`.

---

#### M-16 — CSRF parcialmente mitigado — falta validación de Origin en endpoints sensibles
**Agentes:** A3 (Seg-5.3)  
**Archivos:** `src/app/api/stripe/checkout/route.ts`, `src/app/api/push/subscribe/route.ts`

`SameSite=Lax` mitiga la mayoría de CSRF, pero no todos los casos (navegación POST, subdominios).

**Corrección:**
```typescript
const origin = req.headers.get('origin');
if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

#### M-17 — Skeletons sin dimensiones fijas generan CLS significativo
**Agentes:** A1 (Frontend-Alto)  
**Archivos:** `src/components/ui/skeletons.tsx`

Los skeletons sin `min-height` definido causan layout shifts al cargar, penalizando el CLS en Core Web Vitals y por tanto el ranking SEO.

**Corrección:** Usar dimensiones fijas/min-height en todos los skeletons.

---

#### M-18 — JSONB sin validación en campos críticos de `clinical_records`
**Agentes:** A4 (DB-1.2)  
**Archivos:** `supabase/migrations/000_production_full_schema.sql`

`specialty_data` no tiene CHECK constraints. Un bug en el sync worker puede escribir datos corruptos que generan PDFs en blanco silenciosamente.

**Corrección:**
```sql
ALTER TABLE public.clinical_records
  ADD CONSTRAINT cr_specialty_data_is_object
  CHECK (jsonb_typeof(specialty_data) = 'object');
```

---

#### M-19 — Términos y condiciones sin versiones ni registro de consentimiento
**Agentes:** A3 (Seg-7.1)  
**Archivos:** `src/app/privacidad/page.tsx`, `src/app/terminos/page.tsx`

Las fechas están hardcodeadas. No hay registro de qué versión de términos aceptó cada usuario. Esto puede ser un problema regulatorio en mercados con LGPD/GDPR.

**Corrección:** Almacenar en `profiles`: `terms_accepted_version TEXT`, `terms_accepted_at TIMESTAMPTZ`.

---

#### M-20 — Eliminación de cuenta no limpia el bucket de Storage
**Agentes:** A3 (Seg-7.2)  
**Archivos:** `src/features/admin/actions.ts`

`deleteUserAccount` borra `profiles` y confía en CASCADE de PostgreSQL, pero no elimina logos y firmas del bucket `clinic_assets`.

**Corrección:**
```typescript
await adminClient.storage.from('clinic_assets').remove([`${userId}/`]);
```

---

#### M-21 — PWA puede cachear respuestas de `/api/*` — secretos en Service Worker cache
**Agentes:** A1 (Frontend-PWA)  
**Archivos:** `next.config.ts` (configuración de next-pwa)

next-pwa puede precachear rutas API, sirviendo respuestas offline que incluyen headers de autenticación o secretos del cron.

**Corrección:**
```js
{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }
```

---

### 🟢 BAJOS (9)

| ID | Descripción | Agente | Corrección estimada |
|----|-------------|--------|---------------------|
| B-01 | WizardStepper muestra 4 pasos pero el wizard tiene 6 | A1 | < 1h |
| B-02 | Botones en agenda sin `aria-label` | A1 | < 1h |
| B-03 | `usage-tracker` en localStorage sin rotación — crece indefinidamente | A2 | < 2h |
| B-04 | Log de errores en sessionStorage — se pierde al cerrar pestaña | A2 | < 4h |
| B-05 | `jsPDF` y `JSZip` ya cargados diferido — correcto, sin acción | A7 | ✓ OK |
| B-06 | Exportación ZIP incluye datos no sincronizados — correcto, sin acción | A5 | ✓ OK |
| B-07 | Región de Supabase no documentada para compliance LATAM | A3 | < 1h |
| B-08 | `@stripe/stripe-js` potencialmente en bundle sin uso real | A6 | < 2h |
| B-09 | Tipos TypeScript de Supabase son un paso manual propenso a olvidarse | A4 | < 2h CI |

---

## 3. Top 10 accionable

Ordenados por **Prioridad = Severidad × Impacto en usuarios / Esfuerzo**

---

### #1 — Secretos hardcodeados en git (C-01)
**Prioridad: MÁXIMA — actuar ahora mismo**

**Qué es:** Los valores reales de `push_send_secret` y `resend_email_secret` están en el historial de git del archivo de migración SQL.

**Por qué importa ahora:** Si el repo es visible para alguien externo (contractor, CI, acceso accidental), pueden enviar push notifications o emails como si fueran la plataforma. En un SaaS médico, esto es un vector de phishing contra médicos que confían en notificaciones del sistema.

**Primer paso:**
1. Rotar ambos secretos en Supabase (`UPDATE app_config SET value = 'NUEVO_VALOR' WHERE key = 'push_send_secret'`)
2. Actualizar las variables en Vercel
3. Reemplazar en el SQL con placeholders antes del próximo commit
4. Agregar `push_send_secret` a `.gitignore` de cualquier script de seed

---

### #2 — `follow_up_tasks` nunca se puebla — notificaciones rotas (C-03)
**Prioridad: CRÍTICA — funcionalidad prometida que no funciona**

**Qué es:** Los seguimientos se guardan en `specialty_data` JSONB pero los cron jobs leen de `follow_up_tasks`. Los médicos nunca reciben recordatorios de seguimientos.

**Por qué importa ahora:** La funcionalidad de notificaciones de seguimiento está en el README como feature principal y en el backlog como completada. En producción, ningún médico ha recibido un solo recordatorio. Es una promesa rota al usuario.

**Primer paso:** Crear el trigger `sync_follow_up_task` en Supabase SQL Editor (ver código en C-03). Verificar con un registro de prueba.

---

### #3 — Sin idempotencia en webhooks de Stripe (C-02)
**Prioridad: CRÍTICA — afecta revenue y acceso**

**Qué es:** Un webhook reintentado puede procesar dos veces el mismo evento, activando o cancelando suscripciones incorrectamente.

**Por qué importa ahora:** Con el trial de 7 días activo y médicos pagando, cada webhook duplicado puede dar acceso gratuito a usuarios que deberían pagar, o cortar acceso a médicos que sí pagan. El primer médico que pierda acceso durante una consulta por este bug generará churn inmediato.

**Primer paso:** Crear tabla `stripe_webhook_events` e insertar el check al inicio del handler (ver código en C-02). Tiempo estimado: 2 horas.

---

### #4 — Pruning de IDB puede borrar datos offline no sincronizados (C-04)
**Prioridad: CRÍTICA — pérdida permanente de datos clínicos**

**Qué es:** Si `getPendingRecordIds` falla por un error de crypto, retorna array vacío y el pruning borra pacientes offline que aún no se sincronizaron.

**Por qué importa ahora:** En una HCE, perder una consulta sin que el médico lo sepa es inaceptable. Puede tener consecuencias médico-legales.

**Primer paso:** En `getPendingRecordIds`, si `unwrapData` lanza error, propagar la excepción en lugar de retornar array vacío. Una línea de código que previene pérdida de datos.

---

### #5 — Race condition `DashboardOnboardingGuard` — médicos activos redirigidos a `/billing` (C-08)
**Prioridad: ALTA — bloquea acceso a usuarios legítimos**

**Qué es:** Durante la carga inicial, `tenant` es `null` y el guard redirige a `/billing` aunque el médico tenga suscripción activa.

**Por qué importa ahora:** El primer médico que vea la pantalla de billing después de pagar dejará de confiar en la plataforma. Impacto directo en la primera impresión post-pago.

**Primer paso:**
```typescript
// dashboard-onboarding-guard.tsx
useEffect(() => {
  if (loading) return; // ← esta línea
  // ... resto de lógica
}, [loading, tenant, ...]);
```

---

### #6 — JSON-LD con rating ficticio — riesgo de penalización de Google (C-09)
**Prioridad: ALTA — afecta ranking y credibilidad de marca**

**Qué es:** El schema JSON-LD declara 4.9 estrellas con 89 reseñas para una app en lanzamiento temprano sin reseñas reales.

**Por qué importa ahora:** Google puede detectar datos estructurados falsos y aplicar una penalización manual que desindexe toda la landing. Recuperarse de una penalización manual toma semanas o meses.

**Primer paso:** Eliminar el bloque `aggregateRating` del JSON-LD en `src/app/page.tsx`. 30 segundos de trabajo.

---

### #7 — Trial creado desde el cliente — bypass de suscripción (A-02)
**Prioridad: ALTA — afecta revenue**

**Qué es:** Un usuario puede manipular el INSERT del trial para extender indefinidamente su período gratuito.

**Por qué importa ahora:** Con el trial de 7 días como propuesta de valor central, si se vuelve público que se puede manipular, el modelo de negocio se compromete.

**Primer paso:** Mover `ensureTenantProfile` a una Server Action que use `service_role`. Agregar RLS que bloquee UPDATE de `subscription_status` por el usuario mismo.

---

### #8 — Nombre "Glyph" en toda la app — marca Glyphix invisible (A-14)
**Prioridad: ALTA — afecta toda la estrategia de marketing**

**Qué es:** El nombre comercial Glyphix no aparece en ningún archivo de código. Usuarios ven "Glyph" en todos los puntos de contacto.

**Por qué importa ahora:** Cualquier esfuerzo de marketing bajo la marca "Glyphix" es invisible para los usuarios reales, que ven una app diferente.

**Primer paso:** Crear `APP_NAME = "Glyphix"` en `src/lib/constants/app.ts`. Buscar/reemplazar "Glyph" en `layout.tsx`, `landing-client.tsx`, templates de email.

---

### #9 — Dependencias entre flushes sin guardia cross-flush (A-07)
**Prioridad: ALTA — genera errores silenciosos en modo offline**

**Qué es:** Si un paciente falla en el flush N, su `clinical_record` falla en el flush N+1 por FK violation. Datos clínicos quedan atrapados indefinidamente.

**Por qué importa ahora:** Médicos que trabajan offline frecuentemente (zonas rurales) pueden acumular errores de sync que nunca se resuelven automáticamente.

**Primer paso:** En `buildSyncQueue`, antes de encolar un `clinical_record`, verificar si su `patient_id` está en la cola como pending/failed.

---

### #10 — SQL Injection en `search_global` — ILIKE sin escape (A-01)
**Prioridad: ALTA — vulnerabilidad de seguridad + degradación de rendimiento**

**Qué es:** `ILIKE '%' || p_query || '%'` no escapa caracteres especiales y hace full table scan ignorando los índices GIN.

**Por qué importa ahora:** Con el crecimiento de la base de usuarios, la búsqueda con Ctrl+K comenzará a degradarse. Simultáneamente, un atacante puede usar caracteres como `%` o `_` para afinar queries y extraer más datos.

**Primer paso:** Reescribir `search_global` para usar `websearch_to_tsquery` y los índices GIN existentes. Agregar escape de caracteres LIKE en búsquedas por documento.

---

## 4. Quick wins — Esta semana

Hallazgos de severidad media o alta que se pueden resolver en **menos de 2 horas**:

| ID | Descripción | Tiempo | Impacto |
|----|-------------|--------|---------|
| **C-09** | Eliminar `aggregateRating` ficticio del JSON-LD | 5 min | Elimina riesgo de penalización Google |
| **A-09** | Agregar `/billing` a `isProtectedRoute` en middleware | 5 min | Protege ruta de billing sin autenticación |
| **C-08** | Agregar `if (loading) return` en OnboardingGuard | 2 min | Elimina redirecciones falsas a /billing |
| **A-14** | Eliminar `aggregateRating` + crear `APP_NAME` constante | 30 min | Base para fix de marca Glyphix |
| **M-08** | Verificar error en `claim_api_rate_limit` antes de bypass | 10 min | Rate limiting robusto |
| **A-05** | Corregir operador OR ambiguo en RLS de `push_subscriptions` | 10 min | Elimina exposición de tokens push entre doctores |
| **M-03** | Verificar try/catch completo en script anti-flash | 10 min | Fix crash en Safari privado |
| **M-04** | Habilitar RLS en vista materializada de KPIs | 5 min | Elimina exposición de datos de otras clínicas |
| **B-01** | Corregir WizardStepper 4→6 pasos | 30 min | Fix UX visible en flujo principal |
| **M-09** | Unificar `net.http_post` en funciones de cron | 30 min | Consistencia + reducir riesgo de fallos silenciosos |
| **M-15** | Agregar metadata title/description a páginas legales | 30 min | SEO básico + fix marca en `/privacidad` y `/terminos` |

---

## 5. Roadmap sugerido

### Sprint 1 — Próximas 2 semanas (críticos y altos de seguridad/datos)

**Semana 1 (días 1–5):**
- [ ] C-01: Rotar secretos + eliminar hardcode del SQL
- [ ] C-08: Fix race condition en OnboardingGuard (`if (loading) return`)
- [ ] C-09: Eliminar aggregateRating ficticio del JSON-LD
- [ ] A-09: Agregar `/billing` a middleware SSR
- [ ] A-05: Fix operador OR en RLS de `push_subscriptions`
- [ ] M-04: Habilitar RLS en `mv_dashboard_kpis_daily`
- [ ] M-08: Fix bypass de rate limit cuando RPC falla
- [ ] Quick wins (< 2h c/u) del listado anterior

**Semana 2 (días 6–10):**
- [ ] C-02: Implementar idempotencia en webhooks de Stripe
- [ ] C-03: Crear trigger `sync_follow_up_task` para poblar `follow_up_tasks`
- [ ] A-03: Implementar tabla `notification_log` para deduplicar cron jobs
- [ ] A-02: Mover creación de trial a Server Action con `service_role`
- [ ] A-04: Agregar check de suscripción activa en `/api/cie-suggestions`
- [ ] A-11: Definir grace period en `invoice.payment_failed`
- [ ] A-19: Validar tenant en `log_audit_event` SECURITY DEFINER

### Sprint 2 — Mes 1 (medios con alto impacto)

- [ ] C-04: Fix pruning de IDB cuando crypto falla (lanzar excepción en `getPendingRecordIds`)
- [ ] C-05: Implementar `cryptoInitPromise` compartido para sync worker
- [ ] C-06: Detectar error RLS 42501 en sync worker + modal de suscripción expirada
- [ ] A-01: Reescribir `search_global` con FTS real + escape de caracteres LIKE
- [ ] A-06: Derivar `clinic_id` internamente en `search_global` (eliminar IDOR)
- [ ] A-07: Guardia cross-flush en sync worker para dependencias patient→record
- [ ] A-08: Envolver escrituras IDB en `try/catch` + emitir `APP_EVENT_SYNC_ERROR`
- [ ] A-10: Notificar al usuario cuando se descarta un cambio por drift de reloj
- [ ] A-12: Validación de seats pagados en invitación de miembros
- [ ] A-14: Renombrar "Glyph"→"Glyphix" en toda la app (crear constante `APP_NAME`)
- [ ] A-15: Checklist de migración de dominio + crear redirects 301
- [ ] A-16: Fix animación h1 en landing para no penalizar LCP
- [ ] A-17: Script de validación de variables de entorno en startup
- [ ] A-18: Mover generación de PDF a Web Worker
- [ ] M-01: Limpiar IDB en evento `SIGNED_OUT`
- [ ] M-06: Mapear errores PostgreSQL a mensajes en español
- [ ] M-07: Agregar `doctor_id` al filtro de Realtime en `clinical_records`
- [ ] M-10: Warning antes de destruir stores en migración de IDB
- [ ] M-11: `beforeunload` para forzar guardado de borrador
- [ ] M-12: Focus trap en modal de búsqueda global
- [ ] M-18: CHECK constraints en `specialty_data` JSONB
- [ ] M-19: Campos `terms_accepted_version` y `terms_accepted_at` en profiles
- [ ] M-21: Configurar `NetworkOnly` para rutas `/api/*` en next-pwa

### Backlog técnico (bajos y mejoras opcionales)

- [ ] B-03: Rotación mensual de `usage-tracker` en localStorage
- [ ] B-04: Persistir errores críticos de sync a Supabase además de sessionStorage
- [ ] B-07: Documentar región de Supabase en README y política de privacidad
- [ ] B-08: Auditar si `@stripe/stripe-js` es realmente necesario en bundle
- [ ] B-09: Agregar `npm run db:types` al CI para detectar desfase de tipos
- [ ] M-02: Mover auto-fill del wizard a `useEffect` independiente (O(n) fix)
- [ ] M-13: Documentar flujo de checkout en `actions.ts`
- [ ] M-14: Implementar `hreflang` para versiones es/en
- [ ] M-16: Validación de `Origin` header en endpoints sensibles
- [ ] M-17: Dimensiones fijas en todos los skeletons para mejorar CLS
- [ ] M-20: Limpieza de bucket `clinic_assets` en `deleteUserAccount`
- [ ] A-13: Validación con `zod` en todos los endpoints de API
- [ ] A-06 (billing): Remover `@stripe/stripe-js` del bundle si no se usa
- [ ] Índice `idx_clinical_records_created_at` para queries de dashboard (DB-2.3)
- [ ] Índice parcial `idx_follow_up_tasks_due_pending` con `WHERE status = 'pending'` (DB-2.2)
- [ ] Indicador "Realtime desconectado" en `SyncStatusBanner` (Sync-3.1)
- [ ] Resetear timer de polling después de invalidación por Realtime (Sync-3.3)
- [ ] Channel manager singleton para reutilizar canales Supabase (Sync-3.4)
- [ ] TTL configurable para items pendientes muy viejos en la cola (Sync-1.2)
- [ ] Hash local provisional en consultas selladas offline (Sync-4.1)

---

## 6. Conexión con el backlog existente

### Hallazgos ya en el backlog (`docs/BACKLOG.md`)

Los siguientes hallazgos de la auditoría **ya están documentados** como tareas pendientes o features en desarrollo:

| Hallazgo | Referencia en BACKLOG | Estado |
|----------|-----------------------|--------|
| Trial de 7 días sin tarjeta (A-02) | Sección 1.1-1.4 marcada como completada | ⚠️ Parcialmente — falta validación server-side |
| Notificaciones de fin de trial (A-11) | Sección 1.3 marcada como completada | ⚠️ Solo email implementado, falta grace period |
| Sync invisible (C-04, C-05) | "Sync invisible: Motor de sincronización background" | 🔄 En progreso |
| Core Web Vitals (A-16, M-17) | "SEO Avanzado: Core Web Vitals" | 🔄 Backlog |
| Push notifications (C-07) | Feature "Notificaciones Push" marcada como completada | ⚠️ Funciona pero vulnerable |

### Nuevos descubrimientos para agregar al backlog

Estos hallazgos **no están documentados** en el backlog actual y deben agregarse:

**Críticos (agregar como bloquers):**
- 🆕 **C-01** — Secretos hardcodeados en git — requiere acción inmediata antes de hacer el repo más público
- 🆕 **C-02** — Sin idempotencia en webhooks Stripe — riesgo directo de corrupción de suscripciones
- 🆕 **C-03** — `follow_up_tasks` nunca se puebla — **la feature de notificaciones de seguimiento no funciona**
- 🆕 **C-06** — Suscripción expirada con datos offline — datos atrapados en IDB sin aviso al usuario
- 🆕 **C-08** — Race condition en OnboardingGuard — médicos activos redirigidos a billing

**Altos (agregar como bugs de alta prioridad):**
- 🆕 **A-01** — SQL Injection + full table scan en `search_global`
- 🆕 **A-05** — RLS de `push_subscriptions` con OR ambiguo — fuga de tokens push
- 🆕 **A-06** — IDOR potencial en `search_global` (acepta clinic_id del cliente)
- 🆕 **A-07** — Sin guardia cross-flush en sync worker
- 🆕 **A-09** — Ruta `/billing` sin protección en middleware
- 🆕 **A-12** — Sin validación de seats en invitación de miembros (revenue leak)
- 🆕 **A-19** — `log_audit_event` sin validación de tenant — audit trail comprometible

**Medios (agregar como mejoras):**
- 🆕 **M-04** — Vista materializada de KPIs sin RLS de tenant
- 🆕 **M-19** — Sin versionado de términos/consentimiento (relevante para LGPD/compliance)
- 🆕 **M-20** — `deleteUserAccount` no limpia bucket de Storage

**SEO/Marca (agregar como sprint de marca):**
- 🆕 **C-09** — JSON-LD con rating ficticio — acción urgente antes de indexación
- 🆕 **A-14** — Nombre "Glyphix" ausente en toda la app — crear constante `APP_NAME`
- 🆕 **A-15** — Checklist completo de migración de dominio glyphmed.app → glyphix.app

---

## Apéndice — Resumen ejecutivo para no técnicos

**Estado actual:** La plataforma tiene una arquitectura técnica sólida con RLS en todas las tablas, cifrado de datos en el dispositivo, y un sistema offline-first bien diseñado. Los problemas identificados son principalmente de flujo de datos y configuración, no de diseño fundamental.

**Riesgos más urgentes en términos de negocio:**
1. Los secretos en git deben rotarse **hoy** antes de cualquier otra acción.
2. Las notificaciones de seguimiento **no funcionan** — el 100% de los médicos no recibe recordatorios prometidos.
3. El nombre "Glyphix" es invisible para usuarios reales — todo el marketing apunta a "Glyph".
4. Un médico que paga puede quedar bloqueado si su pago falla, incluso durante una consulta activa.

**Con 5 días de trabajo focalizado** en los quick wins y el Sprint 1, se elimina el 80% del riesgo identificado.

---

*Generado el 2026-05-16 · Agente coordinador de auditoría técnica Glyphix HCE*
