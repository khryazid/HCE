# 🏥 Análisis Completo — HCE Multiespecialidad

## ¿Qué es esta app?

**HCE Multiespecialidad** es una plataforma SaaS **B2B/B2C** de historias clínicas electrónicas (EHR) para médicos y clínicas. Está diseñada con un enfoque **offline-first** y aislamiento **multi-tenant**.

- **Estado:** Producción (v1.0.0)
- **Testers activos:** 3
- **Idioma de UI:** Español (Venezuela / Latinoamérica)

---

## 🧱 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router) |
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| Componentes | Radix UI (primitivos) + shadcn/ui (components.json) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Base de datos | PostgreSQL en Supabase con RLS |
| Offline | IndexedDB via `idb` + cifrado **AES-KW** |
| IA | Google Gemini (`gemini-2.0-flash`) → sugerencias CIE-10 |
| PDF | Generación client-side con `jspdf` |
| Pagos | Stripe SDK integrado (falta configurar productos en dashboard) |
| Emails | Resend (envío de PDFs por email) |
| Notificaciones | Sonner (toasts) |
| State | TanStack React Query v5 |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Linting | ESLint 9 + TypeScript strict |
| CI/Hooks | Husky + lint-staged |
| PWA | next-pwa |

---

## 🗂️ Arquitectura de Rutas

```
src/app/
├── layout.tsx               ← Root layout (QueryProvider + SyncBootstrap)
├── page.tsx                 ← Landing page pública
├── (auth)/
│   ├── login/               ← Inicio de sesión
│   └── registro/            ← Registro de cuenta
├── (dashboard)/
│   ├── layout.tsx           ← Dashboard layout (TenantProvider + ClinicalProvider + Sidebar)
│   ├── dashboard/           ← KPIs y actividad reciente
│   ├── pacientes/           ← Lista + historial clínico del paciente
│   ├── consultas/           ← Wizard de consulta clínica
│   ├── tratamientos/        ← Plantillas de tratamiento
│   ├── ajustes/             ← Perfil profesional y onboarding
│   ├── billing/             ← Gestión de suscripción (Stripe)
│   └── admin/               ← Super Admin Panel (acceso: khristian.yazid@gmail.com)
└── api/
    ├── cie-suggestions/     ← API route → Gemini AI
    └── stripe/              ← Webhook de Stripe
```

---

## 🗃️ Base de Datos (Supabase/PostgreSQL)

Schema único idempotente: `src/lib/supabase/000_production_full_schema.sql`

### Tablas principales

| Tabla | Propósito |
|---|---|
| `profiles` | Perfil del médico/tenant (especialidades, clínica, suscripción) |
| `patients` | Pacientes del médico |
| `clinical_records` | Historia clínica de cada consulta |
| `specialty_data` | Datos específicos por especialidad (JSON) |
| `audit_logs` | Log append-only de eventos (UPDATE/DELETE bloqueados por RLS) |
| `follow_up_tasks` | Tareas de seguimiento clínico |
| `api_rate_limits` | Rate limiting por médico |
| `mv_dashboard_kpis_daily` | Vista materializada de KPIs (cron job opcional) |

### Seguridad

- **RLS** en todas las tablas — aislamiento por `clinic_id` / `doctor_id`
- `SUPABASE_SERVICE_ROLE_KEY` solo en **Server Actions** (admin panel), nunca al cliente
- Admin panel protegido por verificación de email en servidor

---

## ⚙️ Arquitectura de Features (Vertical Slices)

```
src/features/
├── auth/              ← Formularios de login/registro
├── billing/           ← UI de Stripe (checkout, estado de suscripción)
├── consultations/     ← 🏗️ Feature más compleja
│   ├── actions/       ← Server Actions de guardado
│   ├── components/    ← Wizard (3 pasos) + vistas de consultas y tratamientos
│   ├── context/       ← ClinicalProvider (estado global del wizard)
│   ├── lib/           ← Hooks, PDF, CIE-10, domain logic, payloads
│   └── types/         ← Tipos clínicos (SpecialtyKind, etc.)
├── dashboard/         ← KPIs, guard de onboarding, sidebar, búsqueda global
├── patients/          ← Lista de pacientes, historial, status badge
├── admin/             ← Server Actions del super admin (service role)
└── sync/              ← UI de estado de sincronización (banner + bootstrap)
```

---

## 🔄 Flujo Offline-First + Sincronización

Este es el corazón técnico diferenciador de la app:

```
Usuario guarda consulta
       ↓
IndexedDB (local, cifrado AES-KW)
       ↓
Cola de sync (sync_queue en IDB)
       ↓
[Conexión disponible]
       ↓
flushSyncQueue() ← sync-worker.ts
       ↓
Supabase PostgreSQL
```

### Detalles del sync worker

- **Prioridad de tablas:** profiles → patients → clinical_records → specialty_data
- **Deduplicación:** Solo el ítem más reciente por `table:record_id` llega al flush
- **Backoff exponencial:** Delay crece con cada reintento (base 30s × 2^retries, max 1h)
- **Estados:** `pending` → `syncing` → (éxito) eliminado / (fallo) `failed` → (max retries) `abandoned`
- **Dependency guard:** Si un paciente falla, sus `clinical_records` y `specialty_data` esperan al próximo flush (evita FK violations)
- **Conflict resolution:** Si el servidor tiene un registro más nuevo que el cliente, el ítem local se descarta automáticamente
- **Patient merge:** Si hay duplicado de paciente (error 23505), el worker fusiona IDs en IDB automáticamente
- **Trigger:** `window.online` event + flush inicial al cargar

---

## 🧙 Wizard de Consulta Clínica

El wizard tiene **2 modos**:

| Modo | Descripción |
|---|---|
| **Consulta Completa** | Historia clínica desde cero |
| **Seguimiento Clínico** | Evolución de una consulta previa |

### Pasos del wizard (3 pasos)

1. **`wizard-step-patient.tsx`** — Datos del paciente (búsqueda o creación rápida)
2. **`wizard-step-diagnosis.tsx`** — Motivo consulta, antecedentes, examen físico, diagnóstico CIE-10 asistido por Gemini
3. **`wizard-step-treatment.tsx`** — Tratamiento, próximo control, estado del paciente

### Features del wizard
- Auto-scroll al primer campo inválido
- Bullets automáticos en antecedentes (Enter)
- Autoformato T.A. (`120/80`)
- Máscara de fecha `DD/MM/AAAA`
- Sugerencias CIE-10 por Gemini con retry automático (1 intento, delay 1.2s)
- Selector de especialidad dinámico (especialidades reales del médico)
- Quick chips de estado clínico
- Actualización automática del estado del paciente al guardar

---

## 📄 Generación de PDF

Client-side con `jspdf`. Genera **3 documentos** en un solo archivo:
1. Historia clínica completa
2. Receta farmacia
3. Hoja del paciente

Incluye membrete configurable por el médico.

---

## 👑 Admin Panel (Super Admin)

- URL: `/admin`
- Acceso: solo `khristian.yazid@gmail.com` (verificación server-side)
- Usa `SUPABASE_SERVICE_ROLE_KEY` en Server Actions exclusivamente
- Funciones: ver usuarios, activar planes (7d/15d/30d/90d/180d/365d/10años), Lifetime, desactivar, eliminar (doble confirmación)

---

## 🔐 Auth & Sesiones

- `TenantProvider` usa `getUser()` (valida con servidor, más seguro que `getSession()`)
- Listener `onAuthStateChange` → detecta `SIGNED_OUT` y redirige a `/login`
- Middleware limpia cookies `sb-*` si el refresh token es inválido
- Guard de onboarding en todas las rutas del dashboard
- Guard de suscripción: verifica `subscription_status` + `subscription_expires_at`
- Ruta `/admin` bypasea todos los guards clínicos

---

## 🧪 Testing

| Suite | Archivos | Contenido |
|---|---|---|
| **Vitest (unit/integration)** | 15 archivos | Wizard domain, payloads, sync worker, PDF, CIE, DB crypto, dashboard metrics |
| **Playwright (E2E)** | `tests/e2e/` | Flujos completos con credenciales reales |

Estado: Suite en verde (90 tests, 15 archivos).

---

## 📋 Variables de Entorno

| Variable | Req | Propósito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Admin | Solo en servidor (admin panel) |
| `GEMINI_API_KEY` | ✅ | Sugerencias CIE-10 |
| `GEMINI_MODEL` | ⬜ | Default: `gemini-2.0-flash` |
| `STRIPE_SECRET_KEY` | ⬜ | Pagos |
| `STRIPE_WEBHOOK_SECRET` | ⬜ | Webhook Stripe |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | ⬜ | Price ID del plan |
| `RESEND_API_KEY` | ⬜ | Envío de PDFs por email |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Redirects de Stripe |

---

## 🗺️ Roadmap Original (README)

- [ ] QA con testers beta (en curso)
- [ ] **Stripe:** Configurar productos/precios en el dashboard de Stripe y activar flujo completo
- [ ] Cron job en Supabase para refrescar `mv_dashboard_kpis_daily`
- [ ] Despliegue final en Vercel
- [ ] Notificaciones de próximas citas (email o push)
- [ ] Roles adicionales: Assistant, Clinic_Admin (definidos en PRD pero no implementados aún)

---

## ✅ Task List — Tareas Pendientes

> Prioridad: 🔴 Crítico · 🟡 Importante · 🔵 Mejora · ⚪ Futuro

### 💳 Stripe / Billing

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| S-1 | 🔴 | Configurar productos y precios en Stripe Dashboard | Crear product + price ID, pegar `NEXT_PUBLIC_STRIPE_PRICE_ID` en `.env.local` |
| S-2 | 🔴 | Activar flujo completo de checkout | El SDK está integrado pero el botón de compra no conecta con un price real |
| S-3 | 🟡 | Configurar Stripe Webhook en producción | Registrar el endpoint `/api/stripe` en el Stripe Dashboard con el `STRIPE_WEBHOOK_SECRET` correcto |
| S-4 | 🟡 | Verificar que el webhook actualiza `subscription_status` en `profiles` | Cuando Stripe confirma pago → `profiles.subscription_status = 'active'` |
| S-5 | 🔵 | Página de billing con historial de pagos | Mostrar facturas pasadas via Stripe Customer Portal |

### 🗄️ Base de Datos / Supabase

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| D-1 | 🟡 | Activar `pg_cron` y configurar cron job para `mv_dashboard_kpis_daily` | Database → Extensions → pg_cron → ejecutar el `cron.schedule` del README |
| D-2 | 🟡 | Verificar que `log_audit_event` se llama correctamente desde la app | Actualmente la función RPC existe en SQL pero hay que confirmar que el cliente la invoca en cada create/update clínico |
| D-3 | 🔵 | Monitorear registros en `abandoned` del sync_queue | Crear una vista en el admin panel para ver ítems `abandoned` |
| D-4 | ⚪ | Migrar especialidades de texto serializado a array `text[]` | Actualmente `specialty` es `"Cardiología | Medicina General"` (string) — array nativo sería más limpio |

### 🚀 Deploy / Infraestructura

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| I-1 | 🔴 | Deploy a Vercel | Configurar todas las env vars de producción en el dashboard de Vercel |
| I-2 | 🔴 | Configurar `NEXT_PUBLIC_SITE_URL` en producción | Necesario para los redirects de Stripe y Supabase Auth |
| I-3 | 🟡 | Configurar dominio custom | Apuntar DNS a Vercel |
| I-4 | 🟡 | Verificar CSP headers en producción | `next.config.ts` ya tiene CSP, validar con herramienta de seguridad |
| I-5 | 🔵 | Configurar Resend con dominio verificado | Sin dominio verificado los emails de PDF pueden caer en spam |

### 🧪 QA / Testing

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| Q-1 | 🟡 | Completar QA con los 3 testers activos | Recolectar feedback y bugs antes del launch público |
| Q-2 | 🟡 | Configurar `E2E_EMAIL` / `E2E_PASSWORD` en CI | Para que Playwright corra en GitHub Actions |
| Q-3 | 🔵 | Añadir test E2E del flujo de billing (Stripe test mode) | Usar tarjetas de prueba de Stripe en los E2E |
| Q-4 | 🔵 | Test de sincronización offline | Simular pérdida de conexión en Playwright y verificar que la cola funciona |

### 🔔 Notificaciones

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| N-1 | 🔵 | Notificaciones de próximo control por email | Usar `follow_up_tasks.due_date` + Resend para recordatorios |
| N-2 | ⚪ | Push notifications via Service Worker | La app ya tiene PWA/manifest, se puede agregar push con la Web Push API |

### 👥 Roles y Multi-tenant (Futuro)

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| R-1 | ⚪ | Rol `Assistant` | Puede ver agenda y reimprimir, no puede editar registros clínicos |
| R-2 | ⚪ | Rol `Clinic_Admin` | Gestiona médicos de su clínica, no puede ver datos de otras clínicas (RLS por `clinic_id`) |
| R-3 | ⚪ | Invitación de usuarios a una clínica | Flujo de invite por email para agregar asistentes o médicos a un `clinic_id` existente |

### 🩺 Features Clínicas (Futuro)

| # | Prioridad | Tarea | Detalle |
|---|---|---|---|
| F-1 | ⚪ | Envío de PDF por email al paciente | `Resend` ya está en el stack, el PDF se genera en cliente — falta la acción de envío |
| F-2 | ⚪ | Agenda / calendario de citas | `follow_up_tasks` ya existe en DB, falta la vista de calendario |
| F-3 | ⚪ | Recetas con QR de verificación | El PRD menciona formato de récipe, se puede añadir QR con la identidad del médico |
| F-4 | ⚪ | Exportar historia clínica completa del paciente | Generar un PDF consolidado de todas las consultas de un paciente |

