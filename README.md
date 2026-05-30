<div align="center">
  <img src="./public/logo.png" alt="Glyphix Logo" width="120" />
  <h1>Glyphix — Motor Clínico Inteligente ⚕️</h1>
  
  <p>
    <strong>Historia clínica electrónica SaaS: Offline-First, IA-Powered y Multi-tenant.</strong>
  </p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-DB_%2B_Auth-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
    <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-Billing-6772E5?style=for-the-badge&logo=stripe" alt="Stripe" /></a>
    <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright" alt="Playwright" /></a>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square" alt="Build" />
    <img src="https://img.shields.io/badge/Tests-125%2F125-brightgreen?style=flat-square" alt="Tests" />
    <img src="https://img.shields.io/badge/TypeScript-0_errors-brightgreen?style=flat-square" alt="TypeScript" />
    <img src="https://img.shields.io/badge/ESLint-Clean-brightgreen?style=flat-square" alt="ESLint" />
    <img src="https://img.shields.io/badge/E2E-9_specs-brightgreen?style=flat-square" alt="E2E" />
    <img src="https://img.shields.io/badge/PWA-Ready-f36?style=flat-square" alt="PWA" />
    <img src="https://img.shields.io/badge/i18n-ES%20%7C%20EN-9cf?style=flat-square" alt="i18n" />
  </p>

</div>

---

## 🌟 Visión General

**Glyphix** es un **Motor Clínico Inteligente** para médicos modernos que exigen rapidez, seguridad y resiliencia tecnológica. Construido desde cero para funcionar en condiciones extremas: trabaja perfectamente sin conexión a internet y sincroniza automáticamente en la nube cuando la red vuelve.

Con arquitectura multi-tenant de grado empresarial, Glyphix automatiza la facturación, los seguimientos y la codificación de enfermedades — devolviendo a los médicos su recurso más valioso: **el tiempo**.

---

## ✅ Estado Actual del Proyecto *(2026-05-30)*

> Build limpio · 0 errores TypeScript · Build de producción OK · **Versión 1.1.0 (RBAC Multi-Tenant)**

### Features entregadas

| Feature | Descripción |
|---|---|
| **Consulta Wizard** | Flujo guiado 6 pasos → PDF con membrete. PAM auto-calculada, normalidad auto-completada. |
| **UI Adaptativa (Clinical Rompecabezas)** | Secciones colapsables con memoria (JSONB) — el especialista configura el wizard a su flujo. |
| **Constructor Posología** | Parsea texto libre con viñetas y lo convierte en tarjetas de medicación estructuradas. |
| **Offline-First** | IndexedDB + sync worker con backoff exponencial. Eliminaciones remotas se propagan al cache local. |
| **Realtime Sync** | Supabase WebSocket Realtime en 5 tablas (pacientes, citas, consultas, equipo, plantillas). |
| **Agenda Reactiva** | Calendario con polling 30s + `refetchOnWindowFocus` + Realtime — el médico ve citas nuevas al instante. |
| **RBAC 8 Roles** | Sistema de roles: owner, doctor, assistant, clinic_admin, receptionist, lab, imaging, surgery. |
| **Platform Admin** | Panel global `/platform/*` con métricas de orgs, usuarios, suscripciones y detalle de miembros. |
| **Invitaciones Token** | Sistema de invitaciones con token único, 72h expiración, soporte nuevos usuarios y existentes. |
| **IA CIE-11** | Gemini 2.0 Flash sugiere diagnósticos en tiempo real |
| **Plantillas** | Multi-dispositivo en Supabase, versionado JSONB, historial restaurable |
| **Búsqueda Global** | `Ctrl+K` — FTS PostgreSQL con índices GIN + `websearch_to_tsquery` |
| **Dark Mode** | Toggle claro/oscuro/sistema, anti-flash (script pre-hydration) |
| **Notificaciones Push** | VAPID Web Push + cron SQL 8am UTC por seguimientos del día |
| **Recordatorios Email** | Resend API + cron SQL 7am UTC, template HTML branded |
| **Caja y Turnos** | Control de flujo de caja aislado (`cash_shifts`), auditoría de ingresos/egresos y cuadre final. |
| **Laboratorio** | Órdenes de laboratorio, adjunto de resultados técnicos y envío de PDFs por WhatsApp al paciente. |
| **Integraciones Core** | Meta Graph API (WhatsApp) para recordatorios y PDFs. Resend para invitaciones corporativas. |
| **Exportación ZIP** | Historia clínica completa: JSON + un PDF por consulta, 100% client-side |
| **Facturación** | Stripe Checkout, Webhooks firmados, Customer Portal |
| **Config. Global** | T&C Dinámicos en Markdown, Modo Mantenimiento Global, Avisos Persistentes en Dashboard. |
| **Rate Limiting** | Por RPC Postgres en `/api/push/send` y `/api/stripe/*` |
| **Auditoría** | Hash criptográfico encadenado en cada consulta sellada |
| **Onboarding Wizard** | Secuencia forzada de configuración inicial — perfil, especialidad, membrete. |
| **i18n (ES/EN)** | Internacionalización con `next-intl`, mensajes en español e inglés |
| **Cifrado & GDPR** | Migraciones de cifrado de datos sensibles y cumplimiento de protección de datos |
| **UX/UI Premium** | Topnav, landing con Sticky Scroll, auth centrada, settings sidebar, skeletons |

### Últimas mejoras (mayo 2026)

- **🆕 RBAC 8 Roles** — Sistema completo de roles con `owner`, `doctor`, `assistant`, `clinic_admin`, `receptionist`, `lab`, `imaging`, `surgery`. Cada rol tiene su dashboard, navegación y permisos propios.
- **🆕 Platform Admin** — Panel de administración global (`/platform/*`) con sidebar dedicado, métricas de organizaciones/usuarios/suscripciones, y vista detallada de miembros e invitaciones por organización.
- **🆕 Sistema de Invitaciones** — Invitaciones por token con expiración de 72h, soporte para usuarios nuevos (registro inline) y existentes (aceptación directa), API atómica de validación y aceptación.
- **🆕 Route Guards** — Sistema de guardas de ruta de 4 pasos (server + client) con mapa de acceso por rol, permisos customizables via JSONB, y componente `<RoleGuard>` reutilizable.
- **🆕 Migración admin→owner** — Todos los chequeos de rol `"admin"` migrados a `"owner"`/`"clinic_admin"` en 14 archivos (APIs, páginas, guardas).
- **Expansión del Super Admin** — Gestión masiva de clínicas y suscripciones.
- **T&C en Markdown** — Edición dinámica de términos sin tocar código.
- **Rediseño completo de UI** — Landing page, auth, dashboard, agenda, settings.

---

## 🚀 Características Principales

### 📶 Arquitectura Offline-First
- **Local-First:** Todo el motor clínico corre en el navegador usando **IndexedDB**, con tiempos de respuesta de 0ms.
- **Background Sync Queue:** Si se pierde la conexión, la app sigue funcionando. Las consultas y pacientes se encolan silenciosamente.
- **Worker Inteligente:** Al recuperar el internet, un sync worker despacha la cola hacia Supabase con *backoff exponencial* y resolución de conflictos por dependencias.
- **Online-First Refresh:** Refresh silencioso desde Supabase al cargar, manteniendo datos actualizados.

### 🤖 Asistente de IA — CIE-11
- **Gemini 2.0 Flash:** Lee los síntomas en tiempo real y sugiere diagnósticos con códigos **CIE-11** contextualizados.
- Rate Limiting por RPC Postgres — endpoint protegido por función que limita el uso por tenant.

### 🔍 Búsqueda Full-Text
- `Ctrl+K` abre el panel global con debounce de 280ms.
- Índices GIN sobre `tsvector` (`spanish`) en `patients` y `clinical_records`.
- RPC `search_global()` con `websearch_to_tsquery` y `ts_rank` para resultados por relevancia.

### 📦 Exportación ZIP de Historia Clínica
- Un clic en "Exportar ZIP" genera un archivo con:
  - `00_paciente.json` — datos demográficos
  - `index.json` — índice de consultas
  - Un PDF por cada consulta ordenado cronológicamente
- 100% client-side: los datos nunca pasan por un endpoint intermedio.
- Barra de progreso animada con estado por consulta.

### 🌙 Dark Mode
- Toggle: Claro / Oscuro / Sistema — persiste en `localStorage`.
- Script anti-flash embebido en `<head>` de `layout.tsx` aplica el tema antes del hydration.

### 📲 PWA y Notificaciones
- Instalable como app nativa en iOS, Android, macOS y Windows.
- **Web Push** a las 8am UTC con cron SQL `send_followup_push_daily`.
- **Email** (Resend) a las 7am UTC con cron SQL `send_followup_emails_daily`.
- **Notificaciones de Agenda** — Recordatorios automáticos de citas próximas vía cron SQL.

### 🌐 Internacionalización
- Soporte ES/EN con `next-intl`.
- Detección automática de locale y API route `/api/locale` para cambio dinámico.

### 🔐 Seguridad
- RLS en todas las tablas — el backend nunca expone datos de otra clínica.
- Logs inmutables con hash criptográfico encadenado.
- CSP Headers estrictos en `next.config.ts`.
- Variables de entorno validadas en servidor con `src/lib/env.ts`.
- Migraciones de cifrado y cumplimiento GDPR para datos sensibles de pacientes.

---

## 💼 Planes, Roles y Enrutamiento Base

El proyecto se distribuye bajo un modelo SaaS con dos niveles de suscripción manejados vía Stripe, los cuales dictan el acceso y los roles disponibles dentro de la plataforma.

### 1. Plan Profesional Independiente
Diseñado para médicos con consultorio propio o atención en un solo asiento.
- **Características:** Pacientes ilimitados, consultas sin restricciones, sugerencias diagnósticas IA (CIE-11), sincronización offline-first, PDF profesional y soporte básico.
- **Roles:** El médico es `owner` de su propio espacio de trabajo.
- **Flujo:** Al registrarse, entra directo al *Onboarding* individual y su entorno es completamente privado y aislado.

### 2. Plan Clínica (Multi-Tenant)
Diseñado para centros médicos, clínicas y agrupaciones con múltiples profesionales trabajando bajo la misma marca.
- **Características:** Incluye todo lo del Plan Profesional, más la capacidad de agrupar médicos, centralizar facturación, compartir base de pacientes (opcional), flujo de caja unificado y reportes gerenciales.
- **Roles y Permisos (8 roles):**

  | Rol | Dashboard | Permisos |
  |-----|-----------|----------|
  | `owner` | `/dashboard` | Acceso total. Invita personal, ve facturación Stripe, reportes gerenciales, configuraciones. |
  | `doctor` | `/dashboard` | Agenda, pacientes, consultas (Wizard), historial propio. Sin métricas financieras. |
  | `assistant` | `/agenda` | Agenda, pacientes, caja. No puede crear/editar consultas. |
  | `clinic_admin` | `/administracion` | Gestión administrativa de la clínica, equipo, pacientes, caja. |
  | `receptionist` | `/recepcion` | Agenda de citas, admisión de pacientes, turnos de caja. |
  | `lab` | `/laboratorio` | Órdenes de laboratorio, subida de resultados, envío por WhatsApp. |
  | `imaging` | `/imagen` | Módulo de imagenología (próximamente). |
  | `surgery` | `/cirugia` | Módulo de cirugía (próximamente). |

- **Permisos Customizables:** Cada miembro tiene un campo `custom_permissions` (JSONB) para permisos granulares como `can_view_patients`, `can_print_prescriptions`, etc.

### 3. Platform Admin (Super Admin de Plataforma)
Un único operador de Glyphix con acceso global:
- **Activación:** `is_platform_admin = true` en `profiles` (no pertenece a ninguna organización).
- **Panel:** `/platform/*` con dashboard de métricas globales, lista de organizaciones, detalle de miembros e invitaciones.
- **Detección:** El middleware detecta `is_platform_admin` en el paso 1 del flujo de 6 pasos.

### Estructura de Rutas Clave (App Router)
La navegación está protegida por un **Route Guard de 4 pasos** (`src/lib/guards/route-guard.ts`) + middleware SSR (`src/lib/supabase/middleware.ts`).
- **Rutas Públicas:** `/` (Landing), `/login`, `/registro`, `/recuperar`, `/terminos`, `/invite/[token]`.
- **Rutas de Dashboard (`/(dashboard)/`)**:
  - `/dashboard`: Panel central del médico (owner/doctor).
  - `/administracion`: Panel gerencial para clinic_admin/owner.
  - `/agenda`: Calendario reactivo, gestión de "walk-ins" y recordatorios.
  - `/consultas`: Wizard paso a paso (Anamnesis, Examen, CIE-11, Receta).
  - `/pacientes`: Base de pacientes sincronizada offline (IndexedDB).
  - `/laboratorio`: Procesamiento de órdenes médicas.
  - `/caja`: Control de turnos de efectivo (`cash_shifts`).
  - `/ajustes`: Plantillas médicas y gestión de equipo.
  - `/billing`: Customer Portal de Stripe.
- **Rutas de Plataforma (`/(platform)/`)**:
  - `/platform/panel`: Métricas globales (orgs, usuarios, suscripciones).
  - `/platform/organizations`: Lista de todas las organizaciones.
  - `/platform/organizations/[id]`: Detalle de org con miembros e invitaciones.
- **Rutas de Invitación (`/(auth)/`)**:
  - `/invite/[token]`: Página de aceptación de invitación (usuarios nuevos y existentes).

---

## 🏗️ Arquitectura del Sistema

```mermaid
graph TD
    Client[📱 Cliente PWA: Next.js 16 / React 19]
    IDB[(🗄️ IndexedDB Local)]
    PROXY[🔒 proxy.ts: Supabase SSR Auth]
    SW[⚙️ Sync Worker / Backoff Queue]
    SupabaseDB[(☁️ Supabase: PostgreSQL + RLS)]
    Auth[🔑 Supabase Auth]
    AI[🧠 Gemini 2.0 Flash]
    Stripe[💳 Stripe Billing & Webhooks]
    Push[🔔 Web Push / VAPID]
    Email[📧 Resend / Email]
    WhatsApp[💬 WhatsApp Cloud API]
    RT[📡 Supabase Realtime]
    i18n[🌐 next-intl ES/EN]

    Client --> PROXY
    PROXY -->|Protege rutas| Client
    Client <-->|0ms Latency| IDB
    IDB -->|Background Flush| SW
    SW -->|Upsert + Audit Log| SupabaseDB
    SW -->|Refresh + Pruning| IDB
    Client -->|JWT Sessions| Auth
    Client -->|Análisis CIE-11| AI
    Client -->|Gestión Suscripción| Stripe
    Client -->|Locale| i18n
    Stripe -->|Webhooks Verificados| SupabaseDB
    SupabaseDB -->|pg_cron 7am| Email
    SupabaseDB -->|pg_cron 8am| Push
    Client -->|API Recordatorios/PDFs| WhatsApp
    SupabaseDB -->|WebSocket| RT
    RT -->|INSERT/UPDATE/DELETE| Client
```

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Framework & UI** | Next.js 16 (App Router, Webpack), React 19, Tailwind CSS v4 |
| **Backend & BD** | Supabase (PostgreSQL), RLS, pg_cron, FTS con tsvector GIN |
| **Estado & Cache** | TanStack Query v5, IndexedDB (`idb`) |
| **Seguridad** | Supabase SSR proxy.ts, CSP Headers, HSTS, Stripe Signatures, Cifrado GDPR |
| **Machine Learning** | Google Gemini API (`gemini-2.0-flash`) |
| **Pagos** | Stripe API v2026-04-22, Webhooks, Customer Portal |
| **Notificaciones** | Web Push API, VAPID, Resend Email, Agenda Cron |
| **i18n** | next-intl (ES/EN) |
| **PDF / Export** | jsPDF 4.x, JSZip |
| **Validación** | Zod v4 + React Hook Form |
| **Testing** | Vitest (125 tests), Playwright (9 specs E2E) |

---

## 💻 Guía Rápida de Instalación

La guía de instalación paso a paso, configuración de variables de entorno, base de datos local y directrices de despliegue se ha movido a la documentación interna para desarrolladores.

Por favor, para iniciar localmente en menos de 30 minutos consulta:
👉 **[docs/SETUP.md](docs/SETUP.md)**

---

## 🧪 Testing y QA

```bash
# TypeScript — 0 errores
npx tsc --noEmit

# ESLint
npm run lint

# Tests unitarios e integración (125 tests)
npm run test

# E2E en navegadores reales (requiere E2E_EMAIL + E2E_PASSWORD en .env.local)
npm run test:e2e

# E2E headless para un spec específico
npm run test:e2e -- tests/e2e/search.spec.ts
```

### Cobertura E2E (9 specs · ~22 tests)

| Spec | Cubre |
|---|---|
| `auth-consultation-pdf` | Login → consulta completa → PDF download |
| `billing` | Redirect a Stripe checkout/portal |
| `offline-sync` | IndexedDB offline → sync al reconectar |
| `treatments` | CRUD plantillas + historial versiones + restore |
| `search` | Ctrl+K, debounce, min-2-chars, arrow navigation |
| `patients` | Crear, buscar, filtro estado, contexto clínico |
| `theme` | Anti-flash, dark/light/sistema, localStorage |
| `settings` | Perfil, billing button, theme+push panel |
| `export-zip` | Botón visible, descarga .zip, disabled sin consultas |

---

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router — páginas y API routes
│   ├── (auth)/             # Login, registro, recuperación, invitaciones
│   │   └── invite/[token]/ # 🆕 Aceptación de invitaciones por token
│   ├── (dashboard)/        # Dashboard, pacientes, consultas, agenda, admin, ajustes
│   ├── (platform)/         # 🆕 Panel de administración global de la plataforma
│   │   ├── layout.tsx      # 🆕 Sidebar con guarda is_platform_admin
│   │   ├── dashboard/      # 🆕 Métricas globales (orgs, usuarios, subs)
│   │   └── organizations/  # 🆕 Lista + detalle de organizaciones
│   ├── api/
│   │   ├── invitations/    # 🆕 Validación y aceptación de invitaciones
│   │   ├── clinic/         # Invite, members CRUD
│   │   ├── stripe/         # Checkout, webhooks, portal
│   │   └── ...             # push, email, search, IA, locale, auth
│   ├── sin-plan/           # 🆕 Página para usuarios sin membresía activa
│   └── landing-client.tsx  # Landing page con Sticky Scroll Showcase
├── features/               # Lógica de negocio por dominio (Vertical Slice)
│   ├── admin/              # Panel super admin
│   ├── agenda/             # Calendario, citas, modales, Recordatorios WhatsApp
│   ├── auth/               # Formularios y flujos de autenticación
│   ├── billing/            # Integración Stripe + portal
│   ├── cash-flow/          # Flujo de caja y control de turnos aislados
│   ├── clinic-admin/       # Dashboard administrativo de clínicas (8 roles)
│   ├── consultations/      # Wizard, PDF, IA CIE, plantillas, realtime
│   ├── dashboard/          # Métricas, Ctrl+K, Topnav, letterhead, equipo, onboarding guard
│   ├── lab-orders/         # Órdenes de laboratorio, envíos vía WhatsApp
│   ├── onboarding/         # Setup de nuevos tenants y doctores
│   ├── patients/           # CRUD pacientes, ExportZip, realtime hooks
│   ├── referrals/          # Catálogo referencial de especialidades/CIE
│   ├── settings/           # Configuración de cuenta, integraciones
│   └── sync/               # Bootstrap del sync worker
├── components/
│   ├── guards/             # 🆕 RoleGuard — componente de guarda RBAC client-side
│   └── ui/                 # ThemeToggle, ThemeScript, EmptyState, Skeletons, Sheet
├── lib/
│   ├── api/                # Utilidades de API compartidas (guards, schemas)
│   ├── guards/             # 🆕 route-guard.ts — RBAC de 4 pasos, mapa de acceso por rol
│   ├── constants/          # Especialidades médicas y constantes
│   ├── db/                 # IndexedDB schema + queries locales
│   ├── env.ts              # Validación de variables de entorno
│   ├── observability/      # Logger de errores, usage-tracker
│   ├── supabase/           # Cliente SSR/browser, profile (8 roles), tenant, middleware
│   ├── sync/               # Sync worker con backoff exponencial
│   └── utils/              # Fechas, utilidades generales
├── proxy.ts                # Proxy SSR de Next.js 16
└── types/supabase.types.ts # Generado con npm run db:types
messages/
├── es.json                 # Traducciones en español
└── en.json                 # Traducciones en inglés
worker/
└── index.ts                # Service Worker / Sync Worker
supabase/
└── migrations/
    ├── 000_production_full_schema.sql       # Fuente de verdad del schema
    ├── 001_add_client_timestamp_to_audit.sql
    ├── 001_encryption_and_gdpr.sql          # Cifrado + GDPR
    ├── 002_agenda_notifications.sql         # Notificaciones de citas
    └── 009_rbac_organizations.sql           # 🆕 RBAC 8 roles + invitaciones
tests/
├── e2e/                    # Playwright specs (9 archivos)
├── api/                    # Tests de API routes
├── features/               # Tests de features
├── integration/            # Tests de integración
└── *.test.ts               # Vitest: 125 tests
docs/
├── SETUP.md                # Guía de instalación
├── ARCHITECTURE.md         # Decisiones de arquitectura
├── DEPLOYMENT.md           # Guía de despliegue
├── INTEGRATIONS.md         # Stripe, Resend, Gemini
└── DATABASE.md             # Migraciones y esquema
```

---

## 📋 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (webpack) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint sobre todo `src/` |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run test` | Suite Vitest (125 tests) |
| `npm run test:e2e` | Suite Playwright E2E (9 specs) |
| `npm run test:e2e:headed` | E2E con navegador visible |
| `npm run db:types` | Regenera `src/types/supabase.types.ts` desde Supabase |
| `npm run docs:pdf` | Genera documentación en PDF |

---

El backlog técnico principal **ha sido finalizado al 100%**. 
Actualmente el proyecto se encuentra en fase de mantenimiento, QA final y coordinación técnica.

Para ver el estado detallado de las tareas y la auditoría global, revisa **[AUDITORIA_GLYPHIX.md](AUDITORIA_GLYPHIX.md)**.

---

<div align="center">
  <br>
  <strong>Hecho con ❤️ para revolucionar la tecnología en salud digital.</strong>
  <br><br>
  <sub>Distribuido bajo licencia MIT.</sub>
</div>
