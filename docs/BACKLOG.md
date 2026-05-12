# HCE · Backlog de Producción
> Última revisión: 2026-05-12 | Estado del build: ✅ TS 0 errores · 85/85 tests · ESLint limpio

---

## 🗓️ Sprint Actual — Próximas Tareas

Esta es la lista ordenada de lo que trabajamos en la próxima sesión, en prioridad descendente.
**¡TODAS LAS TAREAS DE V1.0 COMPLETADAS! 🎉**

### 🔴 Prioridad Alta (hacer primero)

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

## 🐛 Bugs conocidos / Deuda técnica menor

### ~~BUG-05 · Plan "Clínica" en pricing muestra precio fijo sin validar~~ ✅ Resuelto
Los precios del plan Profesional y Clínica se movieron a constantes `PLAN_PRO_PRICE` y `PLAN_CLINIC_PRICE` en `src/app/page.tsx` para evitar valores "hardcodeados" enterrados en el JSX.

### ~~BUG-06 · Pérdida de datos locales al refrescar o cambiar dispositivo (Sync)~~ ✅ Resuelto
**Descripción:** Un usuario reportó pérdida de pacientes e historias. El problema era que al refrescar la app antes de que el worker subiera los datos, se sobrescribía la base de datos local (IndexedDB) con la versión vieja del servidor. Además, al abrir en un nuevo dispositivo, no se descargaban las historias clínicas.
**Solución:** Se añadieron `refreshClinicalRecordsFromRemote` y `refreshSpecialtyDataFromRemote`. Se integró un filtro en las 3 funciones de `refresh` que lee la cola de sincronización para *saltarse* cualquier registro con cambios locales pendientes.

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
- [ ] **Ejecutar** `supabase/migrations/000_production_full_schema.sql` completo  
  _(incluye índices FTS, `search_global()`, `send_followup_emails()`, crons)_
- [ ] **Actualizar** `app_config` con valores reales:
  ```sql
  insert into public.app_config (key, value) values
    ('site_url',           'https://TU-APP.vercel.app'),
    ('push_send_secret',   'EL_MISMO_QUE_EN_VERCEL'),
    ('resend_email_secret','EL_MISMO_QUE_EN_VERCEL')
  on conflict (key) do update set value = excluded.value, updated_at = now();
  ```
- [ ] **Activar extensión** `pg_cron` en Supabase → Database → Extensions

### ⏳ Pendiente tuyo — Vercel (Environment Variables)
- [ ] `PUSH_SEND_SECRET` → secreto para el cron de push
- [ ] `ADMIN_EMAIL` → tu email de administrador
- [ ] `RESEND_API_KEY` → key de [resend.com](https://resend.com)
- [ ] `RESEND_EMAIL_SECRET` → mismo valor que `resend_email_secret` en `app_config`
- [ ] `RESEND_FROM_EMAIL` → ej. `Glyph <no-reply@tudominio.com>`

### ⏳ Pendiente tuyo — Resend
- [ ] Crear cuenta en [resend.com](https://resend.com) y obtener API Key
- [ ] (Recomendado) Verificar tu dominio para enviar desde `@tudominio.com`
