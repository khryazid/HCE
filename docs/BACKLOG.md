# HCE · Backlog de Producción
> Última revisión: 2026-05-07 | Estado del build: ✅ TS 0 errores · 85/85 tests · ESLint limpio

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
**Descripción:** El insert de `profiles` usa un cast `as any` documentado. A diferencia de `treatment_templates`, este cast existía antes de que los tipos fueran generados con PostgrestVersion 14.5. Hay que verificar si ya es removible.  
**Acción:** Eliminar el cast y probar. Si TS acepta el insert sin el cast → commit. Si sigue fallando → es un bug upstream de Supabase JS.  
**Prioridad:** 🟡 Media (no afecta producción — el `satisfies ProfileInsert` garantiza la forma)

### BUG-02 · Testimonios en landing son ficticios
**Archivo:** `src/app/page.tsx:58-71`  
**Descripción:** Los testimonios "Dr. Alejandro M." y "Dra. Carolina V." son placeholders. En producción esto puede afectar la credibilidad.  
**Acción:** Reemplazar con testimonios reales cuando haya usuarios activos. O remover la sección hasta tenerlos.  
**Prioridad:** 🟡 Media

### BUG-03 · Metadata del layout raíz desactualizada
**Archivo:** `src/app/layout.tsx:14-23`  
**Descripción:** El `title` dice `"HCE Multiespecialidad"` pero el producto se llama **Glyph** (como se muestra en `page.tsx`, login, registro). Inconsistencia de branding.  
**Acción:** Actualizar a `"Glyph — Motor Clínico"` con descripción actualizada.  
**Prioridad:** 🔴 Alta (afecta SEO — esta es la metadata por defecto de todas las páginas del dashboard)

### BUG-04 · `supabase.rpc` usa `as any` en `onboarding.ts`
**Archivo:** `src/lib/supabase/onboarding.ts:124`  
**Descripción:** La llamada a `log_audit_event` usa `(supabase.rpc as any)`. Con los tipos regenerados, `supabase.rpc("log_audit_event", { ... })` debería estar tipado correctamente ahora.  
**Acción:** Eliminar el cast y verificar que el call pasa la validación de TS.  
**Prioridad:** 🟡 Media

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

### M-02 · Stale-While-Revalidate en `useTemplates`
**Descripción:** El hook `useTemplates` no tiene `staleTime` configurado, lo que causa un refetch en cada mount. Para una lista que cambia poco, un `staleTime: 5 * 60 * 1000` (5 minutos) mejoraría la percepción de velocidad.  
**Archivo:** `src/features/consultations/lib/use-consultation-queries.ts`  
**Prioridad:** 🟢 Baja

### M-03 · Rate limiting en más API routes
**Descripción:** Solo `/api/cie-suggestions` tiene rate limiting con `claim_api_rate_limit`. Las rutas `/api/stripe/*` y `/api/push/*` deberían tener también, especialmente en producción.  
**Prioridad:** 🟡 Media

### M-04 · Variables de entorno — validación en startup
**Descripción:** Si una variable crítica (ej. `SUPABASE_SERVICE_ROLE_KEY`) no está configurada en Vercel, el error ocurre en runtime (cuando un usuario hace una acción). Sería mejor validarlas al arrancar.  
**Acción:** Crear `src/lib/env.ts` que valide todas las vars requeridas al importarse.  
**Prioridad:** 🟡 Media

### M-05 · `supabase.types.ts` — regenerar tras cada cambio de schema
**Acción al hacer cambios en BD:** Ver guía completa en `docs/SUPABASE_MIGRATIONS.md`.  
**Prioridad:** 🔵 Proceso (no es un bug, es un recordatorio)

---

## 📋 Checklist para el redeploy actual

- [x] `tsc --noEmit` → 0 errores
- [x] `vitest run` → 85/85
- [x] ESLint → limpio
- [x] Variables de entorno en Vercel verificadas
- [x] SQL `000_production_full_schema.sql` aplicado en Supabase
- [x] Tipos TypeScript regenerados (`npm run db:types`)
- [x] Plantillas de tratamiento migradas de localStorage → Supabase
- [ ] **BUG-03** · Corregir title del layout raíz ("HCE Multiespecialidad" → "Glyph") ← hacer antes del deploy
- [ ] Verificar que `PUSH_SEND_SECRET` está en Vercel
- [ ] Verificar que `ADMIN_EMAIL` está en Vercel
- [ ] Confirmar que `mv_dashboard_kpis_daily` se refresca correctamente (cron job pg_cron activo)
