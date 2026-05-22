# BACKLOG — Glyphix HCE
**Última revisión:** 2026-05-22 (Repaso final — build fix + REVOKE corregido en is_super_admin)
**Estado:** Build ✅ limpio. Pendientes: acciones manuales en Supabase SQL Editor y Vercel.

> Fuente de verdad: `docs/AUDITORIA_2026.md` (50 hallazgos · 13 críticos · 10 altos · 21 medios · 6 bajos · todos corregidos)

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

### SEO / PWA / Marca — Auditoría 2026-05-22

- [x] **SEO-01** — `public/manifest.json`: nombre corregido a "Glyphix — Motor Clínico", `short_name` a "Glyphix", MIME type de ícono corregido de `image/svg+xml` → `image/png`, `theme_color` sincronizado con design system (`#C4602A`), campos PWA completos (`id`, `orientation`, `categories`) _(2026-05-22)_
- [x] **SEO-02** — Dashboard privado: `robots: { index: false }` añadido en `src/app/(dashboard)/layout.tsx` — todas las páginas privadas heredan el noindex _(2026-05-22)_
- [x] **SEO-03** — `landing-client.tsx`: 3 ocurrencias de "Glyph" (sin "ix") en texto visible → `{APP_NAME}` _(2026-05-22)_
- [x] **SEO-04** — `admin/page.tsx`: título "Admin Panel | HCE" → usa `APP_NAME` _(2026-05-22)_
- [x] **SEO-05** — `api/push/send/route.ts`: payload default "Notificación HCE" → `Notificación ${APP_NAME}` _(2026-05-22)_
- [x] **SEO-06** — `sitemap.ts`: añadidas `/privacidad` y `/terminos` _(2026-05-22)_
- [x] **SEO-07** — `login/page.tsx` y `registro/page.tsx`: `alternates.canonical` explícitos añadidos _(2026-05-22)_
- [x] **SEO-08** — `page.tsx` (landing): JSON-LD enriquecido con `url`, `image` y `provider`; `name` usa `APP_NAME` _(2026-05-22)_
- [x] **SEO-09** — `.env.vercel.example`: dominio actualizado a `glyphix.app` en todas las vars + checklist de migración documentado _(2026-05-22)_
- [x] **SEO-10** — `public/og-image.png` → `og-image.webp`: 390 KB → 21 KB (94% más ligero), `layout.tsx` actualizado _(2026-05-22)_
- [x] **SEO-11** — Íconos PWA generados: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-512-maskable.png` (fondo cobre, 10% safe area), `apple-touch-icon.png` 180×180 _(2026-05-22)_
- [x] **SEO-12** — `manifest.json`: rutas de íconos apuntan a archivos reales con dimensiones correctas _(2026-05-22)_
- [x] **SEO-13** — hreflang corregido: eliminado `/en` inexistente (locale es cookie-based), solo `es` + `x-default` _(2026-05-22)_
- [x] **SEO-14** — Titles agregados a todas las páginas del dashboard: Inicio, Consultas, Pacientes, Tratamientos, Ajustes, Facturación _(2026-05-22)_

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
- [x] **Tech Debt (Types)** — Eliminados todos los tipos `any` del código base. _(2026-05-21)_

### Seguridad Backend — Auditoría 2026-05-22

> Auditoría completa del backend: API Routes, Supabase RLS, SQL functions, middleware de Edge, y headers HTTP. 23 hallazgos corregidos en 3 pasadas.

#### 🔴 Críticos
- [x] **HAL-01** — IDOR en `DELETE/PATCH /api/clinic/members/[id]`: cualquier médico podía eliminar miembros de clínicas ajenas. Añadida verificación `assertIsClinicAdmin` con `clinic_members` antes de operar _(2026-05-22)_
- [x] **HAL-02** — `error.message` de Supabase expuesto en producción en múltiples endpoints. Reemplazado por `sanitizeDbError()` con mensajes genéricos _(2026-05-22)_
- [x] **HAL-09** — Storage bucket `clinic_assets` sin aislamiento de tenant: cualquier médico autenticado podía sobrescribir/borrar assets de otras clínicas. RLS reescrita para exigir `(storage.foldername(name))[1] = clinic_id` del usuario _(2026-05-22)_
- [x] **R-04** — 7 funciones `SECURITY DEFINER` sin `SET search_path = public`: vulnerables a schema injection. Corregidas: `log_audit_event`, `notify_followup_due_today`, `send_followup_push_notifications`, `send_followup_emails`, `send_trial_ending_emails` (versiones originales y Sprint 2) _(2026-05-22)_
- [x] **S-01** — `request.headers.set()` en Edge middleware es inmutable: X-Request-ID nunca llegaba a los API Routes. Corregido usando `NextResponse.next({ request: { headers } })` _(2026-05-22)_
- [x] **S-04** — `get_user_id_by_email` accesible por cualquier usuario `authenticated`: permitía mapear cualquier email a UUID contra `auth.users`. `REVOKE EXECUTE` añadido para `authenticated` y `anon` _(2026-05-22)_

#### 🟠 Altos
- [x] **HAL-08** — Comparación de secretos con `===`: vulnerable a timing attacks. Reemplazado por `isSecretValid()` con `crypto.timingSafeEqual` en `push/send`, `email/followup`, `email/trial-ending` _(2026-05-22)_
- [x] **HAL-11** — Sin observabilidad de servidor ni correlación de requests. Creado `src/lib/observability/server-logger.ts` (JSON estructurado para Vercel Logs) + X-Request-ID en middleware + integración en webhook de Stripe _(2026-05-22)_
- [x] **R-01** — `inviteError.message` de Supabase Auth Admin expuesto en `/api/clinic/invite`. Reemplazado por mensaje genérico con log interno _(2026-05-22)_
- [x] **R-02** — `err.message` propagado en el catch final de `clinic/invite`. Sanitizado _(2026-05-22)_

#### 🟡 Medios
- [x] **HAL-03** — Validación manual de body sin Zod en endpoints de email. Añadidos schemas `emailFollowupBodySchema` y `emailTrialEndingBodySchema` con Zod v4 _(2026-05-22)_
- [x] **HAL-05** — Modelo Gemini por defecto incorrecto (`gemini-3.5-flash` inexistente → `gemini-2.0-flash`) _(2026-05-22)_
- [x] **HAL-07** — Estado `paused` ausente de `validStatuses` en `cie-suggestions`: médicos con suscripción pausada no podían usar CIE-10. Corregido _(2026-05-22)_
- [x] **HAL-10** — `RESEND_API_KEY` y `RESEND_EMAIL_SECRET` leídas con `process.env` sin validación. Movidas a `serverEnv` con `requireEnv` para fail-fast en startup _(2026-05-22)_
- [x] **R-07** — `createClient` de Supabase inline en `actions.ts` duplicaba config de `createAdminClient()`. Consolidado _(2026-05-22)_
- [x] **S-02** — `checkout/route.ts` y `portal/route.ts` con `createServerClient` inline usando `!`. Reemplazados por `createClient()` centralizado _(2026-05-22)_
- [x] **S-03** — `supabase/middleware.ts` con `!` en vars NEXT_PUBLIC. Reemplazados por helpers con error descriptivo _(2026-05-22)_
- [x] **S-05** — Faltaban `Referrer-Policy` y `Permissions-Policy` en `next.config.ts`. Añadidos + documentado el riesgo de `unsafe-inline`/`unsafe-eval` en CSP _(2026-05-22)_

#### 🟢 Bajos / Documentación
- [x] **HAL-06** — Deduplicación de `send_followup_emails` ya estaba en Sprint 2 del SQL. Verificado y documentado _(2026-05-22)_
- [x] **R-05** — `NEXT_PUBLIC_IDB_MASTER_KEY` compartida entre todos los usuarios: riesgo de rotación catastrófica. Documentado en `crypto.ts` con estrategia de migración y alternativa a largo plazo _(2026-05-22)_
- [x] **R-06** — `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con `!`. Reemplazados por `getSupabaseUrl()` / `getSupabaseAnonKey()` con error descriptivo en `supabase/server.ts` _(2026-05-22)_

> ⚠️ **Acción manual requerida**: ejecutar las secciones modificadas de `000_production_full_schema.sql` en Supabase SQL Editor para aplicar: Storage RLS tenant isolation (HAL-09), `REVOKE EXECUTE` de `get_user_id_by_email` (S-04), y `SET search_path` en funciones SECURITY DEFINER (R-04).

### Seguridad Parte III — Auditoría 2026-05-22 (esta sesión)

#### 🔴 Críticos aplicados
- [x] **HAL-13.1** — `ensureTenantProfile` en cliente escribía `subscription_status: "trialing"` con anon key (vector de trial bypass). Eliminado del INSERT; la única ruta de escritura de trial es `createTenantProfileWithTrial` (service_role). Policy `profiles_tenant_write` separada en `profiles_tenant_insert` + `profiles_tenant_update` con WITH CHECK que bloquea campos de billing. _(2026-05-22)_
- [x] **HAL-05** — Cron `cleanup-audit-logs` eliminaba registros de auditoría clínica cada 90 días (violación de inmutabilidad e posible infracción regulatoria). `cron.unschedule('cleanup-audit-logs')` añadido al final del schema. _(2026-05-22)_

#### 🟠 Altos
- [x] **HAL-15** — Función `is_super_admin()` RPC no existía en el schema. Admin panel dependía solo del fallback de email. Creada la función SQL con `SECURITY DEFINER` + `current_setting('app.admin_email')`. _(2026-05-22)_
- [x] **SW-01** — Service Worker abría URLs arbitrarias desde el payload de notificaciones push sin validar el origen. Añadida validación: solo URLs del mismo origen se abren; el resto se loguea y se redirige a `/`. _(2026-05-22)_

#### 🟡 Medios
- [x] **HAL-14** — `audit_logs` SELECT policy limitada al propio doctor, impidiendo supervisión por admin de clínica. Ampliada con `OR is_clinic_admin(clinic_id)`. _(2026-05-22)_
- [x] **IDB-01** — `NEXT_PUBLIC_IDB_MASTER_KEY` ausente en `.env.local` y `.env.local.example` causaba crash en runtime. Añadida con valor de desarrollo y documentación de generación segura. _(2026-05-22)_

> ⚠️ **Acciones manuales requeridas tras esta sesión**:
> 1. Ejecutar el bloque `SECURITY HARDENING` al final de `000_production_full_schema.sql` en Supabase SQL Editor.
> 2. Ejecutar `ALTER DATABASE postgres SET app.admin_email = 'tu-email@glyphmed.app';` para que `is_super_admin()` funcione.
> 3. Verificar en Supabase Dashboard → Auth → Settings que `enable_confirmations = true` en producción.
> 4. Subir a Vercel Env Vars: `NEXT_PUBLIC_IDB_MASTER_KEY` con valor generado por `openssl rand -base64 32`.

---

## ✅ Completado

### Auditoría DB/Backend — Parte III (2026-05-22)

#### 🔴 Críticos
- [x] **F-01** — `clinic_members_write` RLS reescrita: eliminado OR con `profiles` que permitía auto-escalada de rol. Ahora solo `is_clinic_admin()` autoriza escrituras en `clinic_members` _(2026-05-22)_
- [x] **F-41** — `is_super_admin()` creada en schema SQL con `SECURITY DEFINER` + `SET search_path`. `verifySuperAdmin()` ya no usa `as never` — llama a la RPC real. ADMIN_EMAIL conservado como fallback documentado _(2026-05-22)_

#### 🟠 Altos
- [x] **F-13** — Realtime `appointments` filtrado por `clinic_id` en lugar de `doctor_id` — asistentes y otros doctores de la clínica ahora disparan el refresh del calendario _(2026-05-22)_

#### 🟡 Medios
- [x] **F-21** — `search_global()` ya no retorna 40 filas cuando `plainto_tsquery` produce tsquery vacío (stopwords como 'el', 'la') — segundo guard `if tsquery = ''` _(2026-05-22)_
- [x] **F-40** — `cie-suggestions` ahora verifica `subscription_expires_at` para `past_due` (7 días gracia) y `paused` (sin gracia) — no solo para `active`/`trialing` _(2026-05-22)_

> ⚠️ **Acción manual requerida**: ejecutar en Supabase SQL Editor:
> 1. **F-01** — `clinic_members_write` policy (buscar `-- F-01` en el archivo SQL)
> 2. **F-21** — `search_global()` con segundo tsquery guard (buscar `-- F-21`)
> 3. **F-41** — `is_super_admin()` function + REVOKE/GRANT (buscar `-- F-41`)
> Luego correr `npm run db:types` para regenerar los tipos y eliminar el cast `as any` en `admin/actions.ts`

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
