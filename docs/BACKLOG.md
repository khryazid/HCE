# BACKLOG — Glyphix HCE
**Última revisión:** 2026-05-21 (Sprint 3 y Backlog técnico 100% completados)
**Estado:** Todos los pendientes técnicos finalizados. Solo quedan acciones manuales del administrador.

> Fuente de verdad: `docs/AUDITORIA_2026.md` (58 hallazgos · 9 críticos · 19 altos · 21 medios · 9 bajos)

---

## 👤 Tareas que solo tú puedes hacer (acciones manuales)

> Estas tareas requieren acceso a dashboards externos o credenciales que no viven en el código. El agente no puede ejecutarlas.

### 🚨 Urgente — hacer antes de cualquier otra cosa

- [x] **[Supabase SQL Editor]** Rotar `push_send_secret` — rotado _(2026-05-21)_
- [x] **[Supabase SQL Editor]** Rotar `resend_email_secret` — rotado _(2026-05-21)_
- [x] **[Vercel Dashboard]** Actualizar las variables de entorno `PUSH_SEND_SECRET` y `RESEND_EMAIL_SECRET` con los nuevos valores rotados — hecho _(2026-05-21)_

### 🟠 Billing y Stripe

- [x] **[Stripe Dashboard]** Configurar reintentos de pago: en *Settings → Subscriptions → Smart Retries*, asegurarse de que el período de reintentos sea ≥ 7 días antes de cancelar
- [x] **[Stripe Dashboard]** Verificar que el webhook endpoint en producción apunte al dominio correcto y tenga todos los eventos necesarios: `invoice.payment_failed`, `customer.subscription.updated`, `checkout.session.completed`

### 🌐 Dominio y DNS (migración glyphmed.app → glyphix.app)

- [x] **[Registrador de dominio]** Comprar / verificar que tienes `glyphix.app`
- [x] **[Vercel Dashboard]** Agregar `glyphix.app` como dominio del proyecto y configurar redirects 301 desde `glyphmed.app`
- [x] **[Supabase Dashboard → Auth → URL Configuration]** Actualizar `Site URL` y `Redirect URLs` al nuevo dominio
- [x] **[Resend Dashboard]** Actualizar el dominio remitente al nuevo dominio y re-verificar DNS (DKIM/SPF)
- [x] **[Vercel Dashboard]** Actualizar `NEXT_PUBLIC_SITE_URL` y `VAPID_MAILTO` al nuevo dominio

### 🗄️ Supabase — acciones en dashboard

- [x] **[Supabase → Database → Extensions]** Verificar que `pg_cron` esté habilitado — ✅ habilitado _(2026-05-21)_
- [x] **[Supabase → Database → Extensions]** Verificar que `pg_net` esté habilitado — ✅ habilitado _(2026-05-21)_
- [x] **[Supabase → Database → Extensions]** Deshabilitar extensión `http` — ✅ deshabilitada, unificado con pg_net _(2026-05-21)_
- [x] **[Supabase SQL Editor]** Aplicar el trigger `sync_follow_up_task` (ver C-03 en auditoría) — ✅ completado _(2026-05-21)_
- [x] **[Supabase SQL Editor]** Crear tabla `stripe_webhook_events` para idempotencia (ver C-02) — ✅ completado _(2026-05-21)_
- [x] **[Supabase SQL Editor]** Crear tabla `notification_log` para deduplicar cron jobs (ver A-03) — ✅ completado _(2026-05-21)_

### 🔔 Push Notifications / VAPID

- [x] **[Terminal local]** Si rotas las claves VAPID: `npx web-push generate-vapid-keys` y actualizar `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` en Vercel _(solo necesario si hay compromiso de las claves actuales)_

---

## 🔴 Sprint 1 — Semana 1 (Críticos + Quick Wins)

> Meta: eliminar los riesgos más urgentes en seguridad, datos y SEO antes de cualquier otra acción.

### Quick Wins (< 2h cada uno)

- [x] **C-09** — Eliminar `aggregateRating` ficticio del JSON-LD en `src/app/page.tsx` — _también corregida marca `name: "Glyphix"`_
- [x] **C-08** — `if (loading) return` en `DashboardOnboardingGuard.useEffect` _(ya estaba implementado — verificado 2026-05-16)_
- [x] **A-09** — Agregar `/billing` a `isProtectedRoute` en `src/lib/supabase/middleware.ts` _(ya estaba implementado — verificado 2026-05-16)_
- [x] **M-08** — Fix bypass de rate limit en `stripe/checkout/route.ts` y `push/send/route.ts`: ahora verifica `error` de la RPC antes de permitir la request
- [x] **A-05** — Corregir operador OR ambiguo en RLS de `push_subscriptions` (paréntesis añadidos en las 3 policies)
- [x] **M-04** — Habilitar RLS en vista materializada `mv_dashboard_kpis_daily` con policy `kpis_tenant_select`
- [x] **M-03** — Script anti-flash en `layout.tsx` ya tiene try/catch completo _(verificado 2026-05-16)_
- [x] **B-01** — Corregir WizardStepper: actualizado de 4 a 6 pasos en `ConsultationsView.tsx`
- [x] **M-09** — Unificar `net.http_post` en `notify_followup_due_today` (eliminado `extensions.http_post`)
- [x] **M-15** — Metadata title/description añadido en `/privacidad` y `/terminos`; marca actualizada a "Glyphix"

### Críticos de Seguridad — Semana 1

- [x] **C-01 (código)** — Secretos hardcodeados reemplazados con placeholders en `000_production_full_schema.sql`  
  _⚠️ Pendiente **tu acción**: rotar los valores reales en Supabase dashboard + Vercel (ver sección "Tareas manuales")_

---

## 🟠 Sprint 1 — Semana 2 (Críticos de Datos y Billing)

- [x] **C-02** — Idempotencia en webhooks Stripe: tabla `stripe_webhook_events` + check `ON CONFLICT DO NOTHING` al inicio del handler
- [x] **C-03** — Trigger `sync_follow_up_task` en `clinical_records` que puebla `follow_up_tasks` desde `specialty_data.next_follow_up_date`  
  _⚠️ Pendiente **tu acción**: ejecutar el bloque SQL del final de `000_production_full_schema.sql` en Supabase SQL Editor_
- [x] **A-03** — Tabla `notification_log` + cron jobs actualizados con deduplicación `ON CONFLICT DO NOTHING`  
  _⚠️ Pendiente **tu acción**: ejecutar el bloque SQL en Supabase SQL Editor_
- [x] **A-02** — Trial movido a Server Action `createTenantProfileWithTrial` con `service_role`. `auth-form.tsx` actualizado para usarla.
- [x] **A-04** — Verificación de `subscription_status` añadida en `/api/cie-suggestions/route.ts` (rechaza con 401 si suscripción inactiva)
- [x] **A-11** — Grace period de 7 días en `invoice.payment_failed`: marca `past_due` sin cortar acceso; solo suspende al llegar a `unpaid` vía `customer.subscription.updated`
- [x] **A-19** — Validación `auth.uid() <> p_doctor_id` añadida en `log_audit_event` SECURITY DEFINER

---

## 🟡 Sprint 2 — Mes 1 (Medios con alto impacto)

### Sync / Offline (críticos diferidos)

- [x] **C-04** — `getPendingRecordIds` propaga excepciones de crypto (ya lanzaba; ahora documentado y callers no lo tragan) _(2026-05-18)_
- [x] **C-05** — `cryptoInitPromise` compartido en `indexeddb.ts` — `ensureCrypto()` serializa todas las llamadas concurrentes _(2026-05-18)_
- [x] **C-06** — Error `42501` detectado en sync worker → emite `APP_EVENT_SUBSCRIPTION_EXPIRED` + banner rojo en `SyncStatusBanner` _(2026-05-18)_
- [x] **A-07** — Guardia pre-enqueue en `enqueueSyncItem`: lanza si el `patient_id` tiene status `abandoned` en la cola _(2026-05-18)_
- [x] **A-08** — `savePatientLocal` y `saveClinicalRecordLocal` envueltos en try/catch + emiten `APP_EVENT_SYNC_ERROR` _(2026-05-18)_
- [x] **A-10** — `emitAppEvent(APP_EVENT_SYNC_ERROR)` al descartar cambio local por clock drift en sync-worker.ts _(2026-05-18)_
- [x] **M-01** — `clearOfflineDb()` llamado en el handler `SIGNED_OUT` del `TenantProvider` _(2026-05-18)_
- [x] **M-10** — Warning `queueMicrotask` + `APP_EVENT_SYNC_ERROR` antes de destruir stores en migración IDB v1→v2 _(2026-05-18)_
- [x] **M-11** — `beforeunload` + `visibilitychange` en `use-wizard-draft-sync.ts` fuerzan guardado inmediato del borrador _(2026-05-18)_

### Seguridad

- [x] **A-01** — `search_global` reescrita con FTS (`websearch_to_tsquery`) + índices GIN. Archivo: `sprint2_search_fts.sql` _(2026-05-18)_
- [x] **A-06** — `clinic_id` derivado internamente en `search_global` desde `auth.uid()` — IDOR eliminado _(2026-05-18)_
- [x] **A-12** — Validación de seats por plan en `/api/clinic/invite/route.ts` con `PLAN_LIMITS` (basic/clinica/enterprise) _(2026-05-18)_
- [x] **M-07** — Filtro `doctor_id=eq.${doctor_id}` añadido en suscripción Realtime de `clinical_records` _(2026-05-18)_

### Marca "Glyphix"

- [x] **A-14** — `APP_NAME = "Glyphix"` creado en `src/lib/constants/app.ts`. Reemplazado en layout, landing, sidebar, auth, emails, billing, wizard _(2026-05-18)_
- [x] **Branding fallbacks** — `sitemap.ts`, `robots.ts`, `api/email/followup/route.ts`, `api/email/trial-ending/route.ts` usaban `glyphmedico.com` hardcodeado — reemplazado con `APP_URL` de constantes _(2026-05-21)_
- [x] **A-15** — Checklist de migración `glyphmed.app` → `glyphix.app` + redirects 301 _(completado — 2026-05-21)_

### Performance / SEO

- [x] **A-16** — `fadeUp` en `landing.css` ahora solo anima `transform` (sin `opacity:0`). Añadido `prefers-reduced-motion` _(2026-05-18)_
- [x] **A-17** — `scripts/validate-env.ts` creado con hooks `predev`/`prebuild` en `package.json` _(2026-05-18)_
- [x] **A-18** — PDF movido a Web Worker (`pdf.worker.ts` + hook `usePdfWorker`) — UI no bloquea en móvil. Fallback a main thread si Worker no disponible _(2026-05-18)_
- [x] **M-17** — `min-height: 70vh` añadido a todos los skeletons (`DashboardSkeleton`, `ConsultasSkeleton`, `PacientesSkeleton`) _(2026-05-18)_
- [x] **M-12** — Focus trap WCAG 2.1 2.4.3 implementado en modal de búsqueda global con `Tab`/`Shift+Tab` _(2026-05-18)_
- [x] **M-14** — `alternates.languages` hreflang (es/en/x-default) añadido al root layout _(2026-05-18)_
- [x] **M-21** — `NetworkOnly` configurado para `/api/*` en `next.config.ts` via `runtimeCaching` _(2026-05-18)_

### UX / Mensajes

- [x] **M-06** — Códigos PG (23505, 42501, 23503, 40001) mapeados a mensajes en español en `sync-queue-panel.tsx` _(2026-05-18)_

### Compliance / Legal

- [x] **M-18** — CHECK constraint `jsonb_typeof(specialty_data) = 'object'` en `sprint2_compliance.sql` _(2026-05-18)_
- [x] **M-19** — Campos `terms_accepted_version` + `terms_accepted_at` añadidos a `profiles` en `sprint2_compliance.sql` _(2026-05-18)_
- [ ] **M-20** — Limpiar bucket `clinic_assets` en `deleteUserAccount` antes del CASCADE _(pendiente: no existe función de borrado de cuenta en el código actual)_

---

## 🟢 Backlog técnico (Bajos + Mejoras opcionales)

- [x] **B-01** — Ya estaba correcto: `WIZARD_STEPS` tiene 6 entradas _(verificado 2026-05-18)_
- [x] **B-03** — Rotación mensual automática en `usage-tracker.ts`: key `hce:ui-usage-metrics:YYYY-MM`, limpieza lazy 5% _(2026-05-18)_
- [x] **B-08** — `@stripe/stripe-js` NO está instalado en package.json — solo `stripe` server-side. No hay bundle extra _(verificado 2026-05-18)_
- [x] **B-09** — Step "Check Supabase DB Types" añadido al job `build-and-test` en `ci.yml` — se omite graciosamente sin secrets _(2026-05-18)_
- [x] **M-02** — Auto-fill del wizard movido a `useEffect` independiente; `setForm` ahora es `useCallback` estable con `[]` deps _(2026-05-18)_
- [x] **M-16** — Validación de `Origin` header en `checkout/route.ts` y `push/subscribe/route.ts` con helper `isValidOrigin` _(2026-05-18)_
- [x] **A-13** — Validación con Zod en `clinic/invite`, `push/send`, `push/subscribe` (POST+DELETE), `stripe/checkout` _(2026-05-18)_
- [x] Índice `idx_clinical_records_created_at` para queries de dashboard (DB-2.3) — en `sprint2_search_fts.sql` _(2026-05-18)_
- [x] Índice parcial `idx_follow_up_tasks_due_pending` con `WHERE status = 'pending'` (DB-2.2) — en `sprint2_search_fts.sql` _(2026-05-18)_
- [x] **Sync-3.1** — Indicador "Realtime desconectado" (naranja) + "Sin conexión" (ámbar) en `SyncStatusBanner`. Status emitido desde `usePatientsRealtime.subscribe()` _(2026-05-18)_
- [x] **Sync-3.3** — Resetear timer de polling después de invalidación por Realtime — `refetchInterval` en `use-agenda.ts` devuelve `false` por 20s tras un evento Realtime, evitando el doble-fetch _(2026-05-21)_
- [x] **Sync-3.4** — Channel manager singleton `src/lib/supabase/realtime-channel-manager.ts` — los 5 hooks de Realtime (agenda, patients, clinical_records, clinic_members, templates) usan `acquire/release` en lugar de crear canales individuales en cada mount _(2026-05-21)_
- [x] **Sync-1.2 (TTL):** Implementar TTL para borrar registros "abandonados" o "done" después de N días en la cola local. — ✅ completado _(2026-05-21)_
- [x] Hash local provisional en consultas selladas offline (Sync-4.1) — ✅ completado _(2026-05-21)_
- [x] **M-20** — Limpiar bucket `clinic_assets` en `deleteUserAccount` antes del CASCADE — ✅ completado _(2026-05-21)_
- [x] **SQL Error Fix** — `search_global()` usaba columnas inexistentes (`first_name`, `reason_for_visit`); `cron.schedule()` dentro del BEGIN/COMMIT rompía toda la transacción si `pg_cron` no estaba activo. Corregido con columnas reales (`full_name`, `chief_complaint`) y DO/EXCEPTION wrapper en todos los cron calls _(2026-05-21)_
- [x] **Tech Debt (Types)** — Eliminados todos los tipos `any` del código base. Se definieron tipos estrictos para Stripe v2026 (`Invoice.parent.subscription_details`, `SubscriptionItem.current_period_end`), firmas genéricas `<T>` en IndexedDB (`wrapData`/`unwrapData`), y aserciones explícitas para RPCs de Supabase (`get_user_id_by_email`). _(2026-05-21)_

---

## ✅ Completado

### Sprint 1 — Semana 1 (2026-05-16)
- [x] **C-08** — Race condition en `DashboardOnboardingGuard` _(ya estaba implementado)_
- [x] **C-09** — `aggregateRating` ficticio eliminado del JSON-LD; marca actualizada a "Glyphix"
- [x] **A-09** — `/billing` ya estaba en middleware.ts _(verificado)_
- [x] **M-03** — Script anti-flash ya tenía try/catch completo _(verificado)_
- [x] **M-08** — Fix bypass de rate limit en `stripe/checkout` y `push/send`
- [x] **A-05** — OR ambiguo en RLS de `push_subscriptions` corregido con paréntesis
- [x] **M-04** — RLS habilitado en `mv_dashboard_kpis_daily`
- [x] **B-01** — WizardStepper actualizado de 4 a 6 pasos
- [x] **M-09** — Cron unificado a `net.http_post` (eliminado `extensions.http_post`)
- [x] **M-15** — Metadata SEO añadido a `/privacidad` y `/terminos`; marca "Glyphix"
- [x] **C-01 (código)** — Secretos reemplazados con placeholders en SQL de migración

### Sprint 1 — Semana 2 (2026-05-16)
- [x] **C-02** — Idempotencia en webhook Stripe (`stripe_webhook_events` + handler)
- [x] **C-03** — Trigger `sync_follow_up_task` — notificaciones de seguimiento ahora funcionarán
- [x] **A-03** — `notification_log` + cron jobs deduplicados
- [x] **A-02** — Trial movido a Server Action con `service_role`
- [x] **A-04** — Check de suscripción en `/api/cie-suggestions`
- [x] **A-11** — Grace period 7 días en `invoice.payment_failed`
- [x] **A-19** — Validación de tenant en `log_audit_event`

### Previo al Sprint 1
- [x] Trial de 7 días sin tarjeta (parcialmente — completado con A-02)
- [x] Notificaciones push VAPID (completado con C-03)
- [x] Webhook Stripe firmado
- [x] RLS en todas las tablas base
- [x] Sistema offline-first (IndexedDB + sync worker)
- [x] Búsqueda global Ctrl+K con FTS PostgreSQL
- [x] Dark mode con anti-flash
- [x] Admin panel
- [x] Exportación ZIP cliente-side
- [x] Auditoría con hash criptográfico encadenado
- [x] Rate limiting por RPC Postgres

---

## Notas de arquitectura

- **Stack:** Next.js 16 (App Router, Webpack forzado), React 19, Tailwind CSS v4, Supabase, Stripe v2026-04-22
- **NO usar Turbopack**: incompatible con next-pwa y el sync worker
- **Schema DB**: único archivo `supabase/migrations/000_production_full_schema.sql`
- **Tipos TS**: regenerar con `npm run db:types` tras cualquier cambio de schema
- **Proxy SSR**: `src/proxy.ts` reemplaza `middleware.ts` en Next.js 16
