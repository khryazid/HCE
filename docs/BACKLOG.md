# HCE · Backlog de Producción
> Última revisión: 2026-05-12 | Estado del build: ✅ TS 0 errores · 85/85 tests · ESLint limpio | 🎨 Redesign en progreso

---

## 🚀 Siguiente Sprint — Onboarding y Sync Transparente

### GRUPO 1 — FREE TRIAL (7 Días)
- [ ] **1.1** — Registro sin tarjeta: Activar 7 días de prueba gratis automático al crear cuenta para ambos planes.
- [ ] **1.2** — Alerta en Dashboard: Mostrar contador de días restantes de prueba en la interfaz principal.
- [ ] **1.3** — Notificación por correo: Configurar cron/Resend para enviar recordatorio de fin de prueba a los 7 días.
- [ ] **1.4** — Landing Page: Actualizar los copys y la sección de precios para destacar y promocionar los "7 días de prueba gratis sin tarjeta".

### GRUPO 2 — SINCRONIZACIÓN INVISIBLE
- [ ] **2.1** — Automatización de Sync: Refactorizar el motor de sincronización (IndexedDB <-> Supabase) para que actúe silenciosamente en segundo plano sin requerir intervención manual del usuario.
- [ ] **2.2** — UX de Sincronización: Eliminar modales invasivos o botones manuales complejos. Reemplazar por un micro-indicador de estado discreto en la barra inferior (Online/Sincronizando/Offline).

### GRUPO 3 — SEO Y PERFORMANCE (Landing Page)
- [ ] **3.1** — Core Web Vitals: Optimizar tiempos de carga, LCP y CLS para alcanzar un score 95+ en Google PageSpeed Insights.
- [ ] **3.2** — Metadatos y Estructura: Implementar Schema Markup, Open Graph estructurado, mapa del sitio (sitemap.xml) y etiquetas alt completas para maximizar el posicionamiento orgánico.

---

## 🗓️ Sprint Anterior — Mejoras UX/UI Completas

> **Reglas de oro antes de empezar:**
> 1. Leer el archivo completo antes de modificarlo
> 2. Después de cada grupo de cambios ejecutar `npx tsc --noEmit` — debe dar 0 errores
> 3. No eliminar funcionalidad existente — solo añadir o mejorar
> 4. Respetar las utilidades CSS existentes: `hce-input`, `hce-btn-primary`, `hce-surface`, etc.
> 5. Todo CSS nuevo va en `src/app/globals.css` salvo que sea lógica de componente

### GRUPO 1 — IMPACTO MÁXIMO (implementar primero)
- [x] **1.1** — FAB (Floating Action Button) para nueva consulta en móvil (`src/app/(dashboard)/layout.tsx`)
- [x] **1.2** — Stepper de progreso en el wizard de consultas (`src/features/consultations/components/ConsultationsView.tsx` & `wizard-stepper.tsx`)
- [x] **1.3** — Badge de alertas en el Sidebar y BottomNav (`src/features/dashboard/components/sidebar.tsx` & `BottomNav`)
- [x] **1.4** — `inputMode="decimal"` en signos vitales (`src/features/consultations/components/wizard-step-diagnosis.tsx`)

### GRUPO 2 — IMPACTO ALTO
- [x] **2.1** — Animación de entrada de páginas y modales (`src/app/globals.css`, `skeletons.tsx`, `confirm-modal.tsx`)
- [x] **2.2** — Ctrl+K con resultados categorizados (`src/features/dashboard/components/global-search.tsx`)
- [x] **2.3** — Dashboard accionable — alertas urgentes (`src/features/dashboard/components/DashboardView.tsx`)
- [x] **2.4** — Toasts contextuales con nombre del paciente (`src/features/consultations/lib/use-consultation-save.ts`)

### GRUPO 3 — REFINAMIENTOS VISUALES
- [x] **3.1** — Búsqueda integrada al Sidebar (`src/features/dashboard/components/sidebar.tsx`)
- [x] **3.2** — Indicador de estado offline/online en Sidebar (`src/features/dashboard/components/sidebar.tsx`)
- [x] **3.3** — Estados vacíos mejorados (`src/features/consultations/components/ConsultationsView.tsx`)
- [x] **3.4** — Lista de pacientes compacta con filtros rápidos (`src/features/patients/components/PatientList.tsx`)

---

## 🎨 Redesign Sprint — "Ferric Meridian" Design System

> Identidad visual: **Ferric Meridian** — clínica industrializada, tierra quemada + cobre oxidado
> Paleta: `#1C120B` (dominante/obsidiana cálida) · `#C4602A` (cobre oxidado/acento) · `#F5EDE4` (pergamino/neutro warm) · `#7A5C4F` (tierra media)
> Tipografía: **Sentient** (display/serif) + **Switzer** (UI sans) — loaded from Fontshare

### Fase 1 — Sistema Base (globals.css)
- [x] **RD-01** — Reescribir variables CSS en `globals.css` con paleta Ferric Meridian ✅
- [x] **RD-02** — Actualizar utilidades `hce-card`, `hce-btn-*`, `hce-input`, `hce-alert-*` ✅
- [x] **RD-03** — Capa de compatibilidad teal→copper para componentes clínicos ✅

### Fase 2 — Landing Page
- [x] **RD-04** — Reescribir `landing.css` con estética Ferric Meridian ✅
- [x] **RD-05** — Landing: botón hero, bento cards, pricing oscuro ✅
- [x] **RD-06** — `layout.tsx` cargando fuentes Sentient + Switzer desde Fontshare ✅

### Fase 3 — Dashboard Shell
- [x] **RD-07** — `sidebar.tsx` rediseñado con logo cobre, fuentes propias ✅
- [x] **RD-08** — `MobileHeader` y `BottomNav` actualizados ✅
- [x] **RD-09** — `DashboardView.tsx` gradientes y tipografía actualizados ✅
- [x] **RD-10** — Tipografía: Sentient+Switzer → **Space Grotesk + Outfit** (Google Fonts) ✅
- [x] **RD-11** — `BottomNav` oculto en desktop (fix inline `display:flex` vs `lg:hidden`) ✅
- [x] **RD-12** — Hero italic `<em>` reemplazado por span cobre weight-800 ✅
- [x] **RD-13** — Paleta modo claro: pergamino → blanco puro `#FFFFFF` ✅
- [x] **RD-14** — Paleta modo oscuro: obsidiana marrón → zinc-950 `#09090B` elegante ✅
- [x] **RD-15** — Habilitado plan "Clínica" en pricing (`/registro?plan=clinica`) ✅

---

### ✅ Completado en esta sesión

- [x] **W-01** — Reestructuración del flujo clínico a 6 pasos (orden médico-legal estricto) ✅  
  Nuevo stepper visual. Componentes separados: `wizard-step-anamnesis.tsx`, `wizard-step-physical-exam.tsx`, `wizard-step-diagnosis-only.tsx`.

- [x] **W-02** — Sexo biológico binario (`Hombre`/`Mujer`) con nota médico-legal ✅  
  Enum estricto en `WizardForm.gender`. Condicional gineco-obstétrico actualizado.

- [x] **W-03** — Tipo de sangre ABO+Rh y Contacto de Emergencia (Paso 1) ✅  
  `blood_type` select (A+…O-) y `emergency_contact` {name, relationship, phone} en UI y JSONB.

- [x] **W-04** — Auto-cálculo de PAM (Presión Arterial Media) ✅  
  Fórmula `(SIS + 2·DIA) / 3` en tiempo real. Badge de color (verde/rojo). Alerta PAM < 65 mmHg.

- [x] **W-05** — Botón "🪄 Normal" por sistema en Examen Físico Segmentario ✅  
  Textos estándar de normalidad para 11 sistemas. Concatena si ya hay texto.

- [x] **W-06** — Órdenes Intrahospitalarias / Medidas Generales (Paso 6) ✅  
  `diet_type` select, `general_measures` y `nursing_cares` textareas. Guardado en `medical_orders` JSONB.

- [x] **W-07** — Payload JSONB actualizado (`specialty_data`) ✅  
  Nuevos campos: `blood_type`, `emergency_contact`, `mean_arterial_pressure`, `medical_orders`.

---

### 🔴 Prioridad Alta

- [x] **FEAT-01** — Módulo de Agenda Médica (Calendario) y Control de Pagos 🚀
  - Crear tabla `appointments` (citas con campos de cobro) en SQL.
  - Agregar `payment_config` a la tabla `profiles`.
  - Crear UI del Calendario en `/dashboard/agenda`.
  - Crear formulario modal para agendar citas rápidas.
  - Sección de configuración de métodos de pago en Ajustes.

- [x] **BUG-01** — Eliminar `as any` residual en `profile.ts:110` ✅  
  Tipos v14.5 aceptan el insert sin cast. `satisfies ProfileInsert` garantiza la forma.

- [x] **BUG-04** — Eliminar `as any` en `onboarding.ts:124` ✅  
  `supabase.rpc("log_audit_event")` ahora tipado correctamente con los tipos regenerados.  
  Bonus: también eliminado el `as any` de `cie-rate-limit.ts` (`claim_api_rate_limit`).

- [x] **M-04** — Validación de variables de entorno al arrancar ✅  
  `src/lib/env.ts` creado con `serverEnv` (getters lazy, errores descriptivos).  
  Integrado en `stripe/webhook`, `stripe/checkout`, `push/send`.

- [x] **M-03** — Rate limiting en rutas `/api/stripe/*` y `/api/push/send` ✅  
  `/api/stripe/checkout`: 5 requests/min por usuario.  
  `/api/push/send`: 10 requests/min por usuario (cron jobs exentos por `x-push-secret`).

### 🟡 Prioridad Media (siguiente bloque)

- [x] **F-02** — PDF con membrete y firma del doctor ✅  
  `buildLetterheadFromSession` en `letterhead.ts`: combina localStorage + `onboarding_profile` como fallback.  
  Conectado en `use-consultation-save.ts` y `PatientHistoryTimeline.tsx`. El PDF ahora se genera correctamente en cualquier dispositivo.

- [x] **F-04** — Conectar notificaciones push con `follow_up_tasks` ✅  
  - `push-notification-toggle.tsx` reescrito: suscripción + desuscripción + notificación de confirmación.  
  - `DELETE /api/push/subscribe` implementado para limpiar el endpoint de la BD.  
  - Cron job SQL `send_followup_push_daily` (8am UTC) en el schema.  
  - Funciones `send_followup_push_notifications` y `notify_followup_due_today` en Postgres.  
  - Bonus: eliminado el último `as any` en `push/subscribe`.

- [x] **F-03** — Panel Admin completo ✅  
  Filtros por estado (pills + stat cards clickables), StatusBadge para todos los estados Stripe  
  (trialing, past_due, paused, incomplete, unpaid), badge "Nuevo" + borde azul para usuarios  
  de las últimas 48h, botón copiar email/ID al portapapeles, contador en tabla sync abandonada.  
  *Actualización:* Precios dinámicos para el Landing configurables desde el panel.

- [x] **BUG-02** — Testimonios ficticios reemplazados ✅  
  Sección convertida a "lanzamiento temprano" con especialidades. Sin nombres inventados.  
  Bonus: auditoría completa de copy — 5 afirmaciones falsas corregidas (free tier, PHI cifrado, tarjeta de crédito, roles de asistente, prueba gratis).

### 🟢 Prioridad Baja (cuando haya espacio)

- [x] **M-01** — E2E tests con Playwright ✅  
  Helper compartido `tests/e2e/helpers/login.ts` elimina duplicación. 5 specs nuevas:  
  `treatments.spec.ts` (CRUD + historial de versiones), `search.spec.ts` (Ctrl+K, debounce,  
  navegación con flechas), `patients.spec.ts` (crear, buscar, filtro estado, contexto clínico),  
  `theme.spec.ts` (anti-flash, toggle dark/light/sistema, localStorage), `settings.spec.ts`  
  (perfil, billing, push toggle). Specs existentes refactorizados para usar el helper.

- [x] **F-10** — UI historial de versiones de plantillas ✅  
  Modal con versiones ordenadas (más nueva primero), badge de versión actual, preview del contenido  
  y botón "Restaurar" que carga el contenido en el formulario para revisar antes de guardar.  
  El botón "Historial (N)" solo aparece cuando hay más de una versión.

- [x] **F-05** — Búsqueda full-text en Supabase ✅  
  Índices GIN (`tsvector` spanish) en `patients` y `clinical_records`. Función RPC `search_global()`  
  con `websearch_to_tsquery` + `ts_rank`. Nueva API route `GET /api/search?q=`. GlobalSearch migrado  
  de carga masiva IndexedDB a debounce de 280ms contra Postgres. Tratamientos mantienen filtro local.

- [x] **F-08** — Dark mode / tema del sistema ✅  
  `[data-theme="dark/light"]` en `<html>` con override manual. Script anti-flash inline en `layout.tsx`  
  (sin FOUC). Hook `useTheme` con persistencia en `localStorage('hce:theme')`. Componente `ThemeToggle`  
  con 3 opciones (Claro / Oscuro / Sistema) integrado en `/ajustes`.

- [x] **F-01** — Plan Clínica multi-doctor ✅
  Nueva tabla `clinic_members`, roles, ajustes de RLS, UI TeamPanel, invitar y remover miembros.

- [x] **F-06** — Exportación ZIP de historia clínica ✅  
  100% client-side (sin API route): `exportPatientZip()` genera un JSZip con  
  `00_paciente.json` + `index.json` + un PDF por consulta vía `generateConsultationPdfBlob()`.  
  `ExportZipButton` muestra barra de progreso animada, estado de éxito y error.  
  Integrado en `PatientHistoryTimeline` junto al botón "Nueva atención".  
  E2E spec: `export-zip.spec.ts` (visibilidad, descarga, disabled sin consultas).
- [x] **F-07** — Recordatorios por email (Resend) ✅  
  `POST /api/email/followup` con auth por header. Template HTML branded. Función SQL  
  `send_followup_emails()` + cron 7am UTC. Clave `resend_email_secret` en `app_config`.
- [x] **F-09** — Internacionalización (i18n) ✅
  Setup fundamental de `next-intl` completado sin alterar las rutas (usa cookies).  
  Archivos `messages/es.json` y `messages/en.json` creados.  
  El Hero del landing page ya está traducido. Selector de idioma temporal agregado en el footer.

---


## ⚡ Estado actual del proyecto

| Check | Estado |
|-------|--------|
| `tsc --noEmit` | ✅ 0 errores |
| `vitest run` | ✅ 85/85 passing |
| `eslint src` | ✅ Sin warnings ni errors |
| Sin archivos basura en `src/` | ✅ Confirmado |
| Sin `console.log` de debug | ✅ Confirmado |
| Sin TODOs/FIXMEs críticos | ✅ Confirmado |
| RLS habilitado en todas las tablas | ✅ Confirmado |
| Tipos Supabase generados y actualizados | ✅ `supabase.types.ts` v14.5 |
| Un solo archivo SQL (fuente de verdad) | ✅ `000_production_full_schema.sql` |

---

## 🛡️ Auditoría de Deuda Técnica y Calidad (Reporte de Estado)

Se realizó una auditoría completa del código estático encontrando lo siguiente:

### Hallazgos de la Auditoría
1. **Errores de Linting (18 errores, 11 warnings)**:
   - Uso excesivo de `any` explícitos en múltiples componentes de la agenda (`appointment-modal.tsx`, `calendar-view.tsx`, `use-agenda.ts`) y de pagos (`payment-settings-panel.tsx`).
   - Anti-patrón de React (`react-hooks/set-state-in-effect`) en `logout-button.tsx`.
   - Dependencias faltantes en useEffect en `ConsultationsView.tsx` (posibles bugs de sincronización).
   - Componentes no utilizados e importaciones huérfanas en varios archivos.
   - Fuente cargada incorrectamente en `layout.tsx` (`no-page-custom-font`).
2. **Dependencias Potencialmente Sin Uso**:
   - `depcheck` detectó `@tailwindcss/postcss`, `fake-indexeddb`, y `tailwindcss` como dependencias de desarrollo sin uso explícito. `@stripe/stripe-js` aparece como dependencia principal sin uso, probablemente debido a importaciones dinámicas que deben validarse.
3. **Consistencia de Tipos**: El build de TypeScript (`tsc --noEmit`) no reportó errores, lo cual es excelente. Sin embargo, los `any` suprimen verificaciones de tipo y deben resolverse.
4. **Seguridad**: No se detectaron vulnerabilidades críticas ni exposición obvia de secretos en el frontend, el RLS de Supabase se encarga de la seguridad de la capa de datos.

### 📋 Tasklist de Resolución (Prioridad de Ejecución)

- [x] **TD-01** — Corregir antipatrones de React: Resolver `react-hooks/set-state-in-effect` en `logout-button.tsx` y `react-hooks/exhaustive-deps` en `ConsultationsView.tsx` (Prioridad Alta: Afecta rendimiento/bugs).
- [x] **TD-02** — Limpiar importaciones y variables sin uso: Remover íconos y componentes declarados pero no usados en `appointment-modal.tsx`, `payment-settings-panel.tsx` y `agenda/page.tsx` (Prioridad Media).
- [x] **TD-03** — Refactorizar tipos `any`: Tipar correctamente las variables en `use-agenda.ts`, `calendar-view.tsx` y `payment-settings-panel.tsx` evitando usar `any` (Prioridad Media).
- [x] **TD-04** — Resolver `no-page-custom-font`: Mover o corregir la carga de fuentes en `layout.tsx` según las recomendaciones de Next.js (Prioridad Media).
- [x] **TD-05** — Auditoría de dependencias: Validar el uso de `@stripe/stripe-js`, `tailwindcss` y `fake-indexeddb`, y desinstalarlos si realmente son código muerto (Prioridad Baja).

---

## 🚀 Features Futuras (v1.0 Completado)

**Todas las features planificadas para la versión 1.0 han sido completadas con éxito.**
- Plan Clínica (Multi-doctor) ✅
- Firma Digital y Membrete en PDF ✅
- Panel de Admin (Suscripciones y Precios Dinámicos) ✅
- Notificaciones Push para Seguimientos ✅
- Búsqueda Full-Text (Ctrl+K) ✅
- Exportación ZIP de Historia Clínica ✅
- Recordatorios por Email (Resend) ✅
- Modo Oscuro / Claro / Sistema ✅
- Internacionalización (i18n fundamental) ✅
- **Wizard HCE Completo** — Revisión por Sistemas, SOAP, Pronóstico, Escala EVA, Tabla de Medicamentos, Datos Pediátricos, Tipo de Consulta ✅

Actualmente no hay nuevas features mayores planificadas. El enfoque es monitoreo y estabilidad post-lanzamiento.

---

## 🗂️ Tareas de mantenimiento / Calidad

### ~~M-01 · Playwright E2E — Ampliar cobertura~~ ✅ Resuelto
Completadas 9 specs cubriendo todos los flujos principales.

### ~~M-02 · Stale-While-Revalidate en `useTemplates`~~ ✅ Resuelto
**Solución:** `staleTime: 5 * 60 * 1000` añadido en `use-consultation-queries.ts`.

### ~~M-03 · Rate limiting en más API routes~~ ✅ Resuelto
Añadido a `/api/stripe/*` y `/api/push/*`.

### ~~M-04 · Variables de entorno — validación en startup~~ ✅ Resuelto
`src/lib/env.ts` creado y en uso.

### M-05 · `supabase.types.ts` — regenerar tras cada cambio de schema
**Acción al hacer cambios en BD:** Ver guía completa en `docs/SUPABASE_MIGRATIONS.md`.  
**Prioridad:** 🔵 Proceso (no es un bug, es un recordatorio)

---


## 📋 Checklist del deploy actual

### ✅ Listo (código)
- [x] `tsc --noEmit` → 0 errores
- [x] `vitest run` → 85/85
- [x] ESLint → limpio
- [x] Tipos TypeScript regenerados con `npm run db:types` (PostgrestVersion 14.5)
- [x] `layout.tsx` metadata → `"Glyph — Motor Clínico"`
- [x] `useTemplates` con `staleTime: 5min`

### ⏳ Pendiente tuyo — Supabase (SQL Editor)
- [x] **Ejecutar** `supabase/migrations/000_production_full_schema.sql` completo  
  _(incluye índices FTS, `search_global()`, `send_followup_emails()`, crons)_
- [x] **Actualizar** `app_config` con valores reales:
  ```sql
  insert into public.app_config (key, value) values
    ('site_url',           'https://TU-APP.vercel.app'),
    ('push_send_secret',   'EL_MISMO_QUE_EN_VERCEL'),
    ('resend_email_secret','EL_MISMO_QUE_EN_VERCEL')
  on conflict (key) do update set value = excluded.value, updated_at = now();
  ```
- [x] **Activar extensión** `pg_cron` en Supabase → Database → Extensions

### ⏳ Pendiente tuyo — Vercel (Environment Variables)
- [x] `PUSH_SEND_SECRET` → secreto para el cron de push
- [x] `ADMIN_EMAIL` → tu email de administrador
- [x] `RESEND_API_KEY` → key de [resend.com](https://resend.com)
- [x] `RESEND_EMAIL_SECRET` → mismo valor que `resend_email_secret` en `app_config`
- [x] `RESEND_FROM_EMAIL` → ej. `Glyph <no-reply@tudominio.com>`

### ⏳ Pendiente tuyo — Resend
- [x] Crear cuenta en [resend.com](https://resend.com) y obtener API Key
- [x] (Recomendado) Verificar tu dominio para enviar desde `@tudominio.com`
