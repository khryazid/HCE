# HCE · Backlog de Producción
> Última revisión: 2026-05-09 | Estado del build: ✅ TS 0 errores · 85/85 tests · ESLint limpio

---

## 🗓️ Sprint Actual — Próximas Tareas

Esta es la lista ordenada de lo que trabajamos en la próxima sesión, en prioridad descendente.

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

- [x] **BUG-02** — Testimonios ficticios reemplazados ✅  
  Sección convertida a "lanzamiento temprano" con especialidades. Sin nombres inventados.  
  Bonus: auditoría completa de copy — 5 afirmaciones falsas corregidas (free tier, PHI cifrado, tarjeta de crédito, roles de asistente, prueba gratis).

### 🟢 Prioridad Baja (cuando haya espacio)

- [ ] **M-01** — Ampliar cobertura de tests E2E con Playwright  
  Flujo de consulta completo, PDF, plantillas, billing redirect.

- [ ] **F-10** — UI de historial de versiones de plantillas  
  Modal en `TreatmentsView` para ver y restaurar versiones anteriores. La data ya existe en `versions` JSONB.

- [ ] **F-05** — Búsqueda full-text en Supabase  
  Escalar `GlobalSearch` de filtro en memoria (IndexedDB) a `tsvector` de Postgres.

- [ ] **F-08** — Soporte dark mode / tema del sistema  
  Variables CSS en `:root` y `[data-theme="dark"]` con detección `prefers-color-scheme`.

- [ ] **F-01** — Plan Clínica multi-doctor  
  Nueva tabla `clinic_members`, roles, ajustes de RLS, pricing con seats.

- [ ] **F-06** — Exportación de historia clínica (ZIP portabilidad)  
- [ ] **F-07** — Recordatorios por email (Resend/SendGrid + cron)  
- [ ] **F-09** — Internacionalización (i18n)  

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

### BUG-01 · `as any` en `profile.ts` (residual)
**Archivo:** `src/lib/supabase/profile.ts:110`  
**Descripción:** El insert de `profiles` usa un cast `as any` documentado. Los tipos ya son v14.5 — verificar si ya es removible.  
**Acción:** Eliminar el cast y probar. Si TS acepta → commit. Si sigue fallando → bug upstream de Supabase JS.  
**Prioridad:** 🔴 Alta

### ~~BUG-02 · Testimonios en landing eran ficticios~~ ✅ Resuelto
Sección reemplazada con estado honesto de lanzamiento temprano. Copy completo auditado y corregido.

### ~~BUG-03 · Metadata del layout raíz desactualizada~~ ✅ Resuelto
`layout.tsx` actualizado — title: `"Glyph — Motor Clínico"` con descripción SEO correcta.

### BUG-04 · `supabase.rpc` usa `as any` en `onboarding.ts`
**Archivo:** `src/lib/supabase/onboarding.ts:124`  
**Descripción:** La llamada a `log_audit_event` usa `(supabase.rpc as any)`. Con los tipos v14.5 regenerados debería estar tipado correctamente.  
**Acción:** Eliminar el cast y verificar que el call pasa TS.  
**Prioridad:** 🔴 Alta

### BUG-05 · Plan "Clínica" en pricing muestra precio fijo sin validar
**Archivo:** `src/app/page.tsx:457-497`  
**Descripción:** El precio `$99/mes` está hardcodeado en el HTML con un botón deshabilitado "Próximamente". Si el precio cambia antes de lanzar ese plan, habrá que actualizar manualmente.  
**Acción:** O mover el precio a una constante, o remover el plan hasta que esté listo.  
**Prioridad:** 🟢 Baja

---

## 🚀 Features Futuras (por prioridad)

### F-01 · Plan Clínica — Multi-doctor
**Descripción:** El pricing ya lo anticipa. Permite que múltiples médicos compartan la misma `clinic_id`, con roles diferenciados (admin, médico, asistente).  
**Impacto:** Desbloquea mercado de clínicas, centros de salud y consultorios asociados.  
**Requiere:**
- Nueva tabla `clinic_members` (clinic_id, user_id, role)
- Ajustes de RLS: pacientes visibles por todos los doctores de la clínica (ya funciona), pero con control de escritura por rol
- UI de gestión de miembros en `/ajustes`
- Stripe: plan distinto con seats (precio por usuario adicional)

### F-02 · Firma Digital y Membrete del Doctor en PDF
**Descripción:** El PDF actual existe, pero sin la firma del doctor ni el membrete personalizado (logo, dirección, datos profesionales del `onboarding_profile`).  
**Impacto:** El PDF es el producto tangible que el médico entrega al paciente. Es lo que más impresiona.  
**Requiere:**
- Leer `onboarding_profile` del `user_metadata` al generar el PDF
- Componente de firma (imagen o texto estilizado)
- Campo para subir logo en `/ajustes` (Storage de Supabase)

### F-03 · Panel de Admin — Gestión de Suscripciones
**Descripción:** La ruta `/admin` existe pero su gestión de suscripciones es parcial. Necesita: buscar usuarios, ver estado, asignar `lifetime`, extender trial, revocar acceso.  
**Impacto:** Operación crítica para el negocio — sin esto el admin depende de Supabase Dashboard directamente.  
**Requiere:**
- API routes protegidas por `ADMIN_EMAIL`
- UI de búsqueda de perfiles
- Acciones: cambiar `subscription_status`, ajustar `subscription_expires_at`

### F-04 · Notificaciones Push para Seguimientos
**Descripción:** La infraestructura de Web Push está implementada (VAPID, tabla `push_subscriptions`, endpoint `/api/push/send`). Falta conectarla con `follow_up_tasks` para enviar recordatorios cuando vence una tarea.  
**Impacto:** Diferenciador clave — el médico recibe una notificación en el celular cuando tiene un seguimiento pendiente.  
**Requiere:**
- Cron job en Supabase que llame a `/api/push/send` con los pacientes que vencen ese día
- UI para activar/desactivar notificaciones en `/ajustes`
- Prueba de entrega end-to-end

### F-05 · Búsqueda Full-Text en Pacientes y Consultas
**Descripción:** La búsqueda global actual (`Ctrl+K`) funciona con filtro en memoria (IndexedDB local). Para clínicas con miles de pacientes esto no escala.  
**Impacto:** Performance en cuentas grandes.  
**Requiere:**
- Índice `tsvector` en `patients.full_name` y `clinical_records.chief_complaint`
- API route de búsqueda que use `@@` (full-text search de Postgres)
- Migrar `GlobalSearch` de IndexedDB a la nueva API con debounce

### F-06 · Exportación de Historia Completa (ZIP / Portabilidad)
**Descripción:** El médico puede exportar toda la historia clínica de un paciente como un ZIP con PDFs de cada consulta y un JSON estructurado.  
**Impacto:** Cumplimiento de regulaciones de portabilidad de datos médicos. Diferenciador vs competencia.  
**Requiere:**
- API route que genere PDFs por consulta y los comprima
- UI de exportación en la vista del paciente

### F-07 · Recordatorios por Email
**Descripción:** Enviar email al médico (y/o al paciente) cuando hay un seguimiento que vence al día siguiente.  
**Impacto:** Complementa las notificaciones push. Útil cuando el médico no tiene el browser abierto.  
**Requiere:**
- Integración con Resend o SendGrid
- Template de email HTML
- Cron job diario (puede reutilizar el mismo de F-04)

### F-08 · Modo Oscuro / Tema del Sistema
**Descripción:** La app actualmente usa un tema fijo. Soporte para dark mode del sistema operativo.  
**Impacto:** UX y accesibilidad. Muchos médicos trabajan de noche.  
**Requiere:**
- Variables CSS en `:root` y `[data-theme="dark"]`
- Toggle en `/ajustes` o detección automática con `prefers-color-scheme`

### F-09 · Internacionalización (i18n)
**Descripción:** La app está en español. Para expandir a otros mercados (México, Colombia, España) con variantes regionales.  
**Impacto:** Expansión de mercado.  
**Requiere:**
- `next-intl` o equivalente
- Archivos de mensajes por locale
- Selector de idioma (o detección automática por navegador)

### F-10 · Historial de Versiones de Plantillas — UI
**Descripción:** La tabla `treatment_templates` ya guarda un array `versions` con el historial completo. La UI de `TreatmentsView` muestra el número de versiones pero no permite ver ni restaurar versiones anteriores.  
**Impacto:** Valor clínico real — el médico puede ver cómo evolucionó el tratamiento de una condición.  
**Requiere:**
- Modal de historial de versiones en `TreatmentsView`
- Botón "Restaurar versión X"

---

## 🗂️ Tareas de mantenimiento / Calidad

### M-01 · Playwright E2E — Ampliar cobertura
**Descripción:** Los tests E2E actuales son 3 (con algunos skipped). Necesitan cubrir: flujo de consulta completo, generación de PDF, plantillas de tratamiento, billing redirect.  
**Prioridad:** 🟡 Media

### ~~M-02 · Stale-While-Revalidate en `useTemplates`~~ ✅ Resuelto
**Solución:** `staleTime: 5 * 60 * 1000` añadido en `use-consultation-queries.ts`.

### M-03 · Rate limiting en más API routes
**Descripción:** Solo `/api/cie-suggestions` tiene rate limiting con `claim_api_rate_limit`. Las rutas `/api/stripe/*` y `/api/push/*` deberían tener también, especialmente en producción.  
**Prioridad:** 🟡 Media

### M-04 · Variables de entorno — validación en startup
**Descripción:** Si una variable crítica (ej. `SUPABASE_SERVICE_ROLE_KEY`) no está configurada en Vercel, el error ocurre en runtime. Mejor validarlas al arrancar.  
**Acción:** Crear `src/lib/env.ts` que valide todas las vars requeridas al importarse.  
**Prioridad:** 🔴 Alta

### M-05 · `supabase.types.ts` — regenerar tras cada cambio de schema
**Acción al hacer cambios en BD:** Ver guía completa en `docs/SUPABASE_MIGRATIONS.md`.  
**Prioridad:** 🔵 Proceso (no es un bug, es un recordatorio)

---


## 📋 Checklist del deploy actual

- [x] `tsc --noEmit` → 0 errores
- [x] `vitest run` → 85/85
- [x] ESLint → limpio
- [x] SQL `000_production_full_schema.sql` aplicado en Supabase
- [x] Tipos TypeScript regenerados con `npm run db:types` (PostgrestVersion 14.5)
- [x] Plantillas de tratamiento migradas de localStorage → Supabase
- [x] `layout.tsx` metadata → `"Glyph — Motor Clínico"` (BUG-03 resuelto)
- [x] `useTemplates` con `staleTime: 5min` (M-02 resuelto)
- [ ] Verificar que `PUSH_SEND_SECRET` está configurado en Vercel
- [ ] Verificar que `ADMIN_EMAIL` está configurado en Vercel
- [ ] Confirmar que pg_cron está activo en Supabase (refresca `mv_dashboard_kpis_daily` a las 00:00)
