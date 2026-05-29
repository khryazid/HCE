# Glyphix — Plan de Implementación de Nuevas Funcionalidades

## Contexto

Requerimientos recibidos 2026-05-28: 7 áreas funcionales nuevas para Glyphix HCE.
Base: `develop` branch, build ✅, 123 tests ✅, 0 lint errors.

---

## Priorización Propuesta — Fases

Dado el volumen masivo de trabajo, propongo dividir en **4 fases** ordenadas por impacto clínico y complejidad técnica:

| Fase | Features | Complejidad | Justificación |
|---|---|---|---|
| **Fase 1** | Patient Profile Overlay + PDF Print Selector | Media | Valor inmediato para el médico, 0 migraciones SQL, usa datos existentes |
| **Fase 2** | Lab Orders + Medical Referrals | Alta | Requieren nuevas tablas SQL, RLS, sync offline |
| **Fase 3** | Clinic Admin Dashboard + Cash Flow | Alta | Dashboard separado, métricas cross-doctor, scope de plan `clinic` |
| **Fase 4** | Subscription Alerts + Onboarding + Email Toggle + WhatsApp eval | Media | Mejoras UX, integraciones externas |

> **IMPORTANTE:** Cada fase se implementará en un PR separado. Dentro de una misma sesión, se implementará una fase completa antes de pasar a la siguiente.

---

## Fase 1 — Patient Profile Overlay + PDF Print Selector

### 1A. Overlay / Modal de Perfil de Paciente

**Flujo del usuario:** El médico hace clic en un paciente → se abre un overlay/modal con perfil completo, métricas, diagnóstico rápido e historial apilado.

**Estado actual:**
- Ya existe `src/features/patients/components/patient-profile-card.tsx` como panel lateral — pero es un `<article>` estático dentro del layout de pacientes, no un overlay/modal.
- Los datos ya se cargan: `patientHistory`, `patient`, status.
- Falta: métricas calculadas, diagnóstico rápido, timeline apilado, formato overlay/modal.

**Propuesta:**

#### [NEW] `src/features/patients/lib/patient-profile-helpers.ts`
Funciones puras de dominio:
- `calculatePatientProfileMetrics(records)` → `{ totalConsultations, firstVisitDate, lastVisitDate, lastDiagnosis, lastCieCodes, lastSpecialty }`
- `buildPatientTimeline(records)` → `{ date, chiefComplaint, specialty, cieCodes }[]`
- `calculateAge(birthDate)` → `number | null`
- `formatRelativeDate(dateString)` → `"hace 3 días"` etc.
- `getPatientRecords(allRecords, patientId)` → filtered + sorted

#### [NEW] `src/features/patients/components/patient-profile-overlay.tsx`
Componente overlay/modal:
- **Header**: nombre, doc number, edad, teléfono, status badge (sin imagen)
- **Métricas row**: total consultas, primera/última visita, última especialidad
- **Diagnóstico rápido**: último diagnóstico + CIE-11 codes
- **Timeline apilado**: historial de consultas (motivo + fecha) con scroll
- Se abre via click en `patient-list.tsx` o desde cualquier otro punto
- Usa `Dialog` pattern (accesible, `Escape` cierra, backdrop click cierra)

#### [MODIFY] `src/features/patients/components/patients-view.tsx`
- Agregar estado `overlayPatientId` para controlar qué paciente se muestra en overlay
- Click en paciente → abre overlay en vez de solo seleccionar en panel lateral

#### [NEW] `tests/features/patients/patient-profile-helpers.test.ts`
- Tests para `calculatePatientProfileMetrics`, `buildPatientTimeline`, `calculateAge`, `formatRelativeDate`

**Impacto SQL:** Ninguno — usa datos existentes de `clinical_records` + `patients`.
**Impacto sync/offline:** Ninguno — lecturas de IndexedDB existentes.

---

### 1B. PDF Print Selector (Recipe, Lab Orders, Historia Completa)

**Flujo del usuario:** Al descargar el PDF, aparece un selector/checklist que permite elegir qué secciones imprimir: historia completa, solo recipe médico, solo órdenes de laboratorio, o combinación personalizada.

**Estado actual:**
- Ya existe el sistema PDF completo en `src/features/consultations/lib/pdf/`
- `ConsultationPdfData` ya tiene `labOrders`, `imagingOrders`, `treatmentPlan`, `medicationInstructions`
- El wizard ya tiene campos `labOrders: string[]` e `imagingOrders: string[]`
- Falta: UI de selección de secciones + renderizado selectivo

**Propuesta:**

#### [NEW] `src/features/consultations/lib/pdf/pdf-section-selector.ts`
Tipos y constantes:
```typescript
export type PdfSectionKey =
  | "full_history"       // Historia completa
  | "recipe"             // Solo recipe médico (medicamentos + instrucciones)
  | "lab_orders"         // Solo órdenes de laboratorio
  | "imaging_orders"     // Solo órdenes de imagenología
  | "custom";            // Selección personalizada

export type PdfSectionConfig = {
  key: string;
  label: string;
  checked: boolean;
};

export const PDF_PRESETS: Record<string, PdfSectionKey[]> = { ... };
```

#### [NEW] `src/features/consultations/components/pdf-section-selector-modal.tsx`
Modal con:
- Presets rápidos: "Todo", "Recipe médico", "Órdenes de lab", "Imagenología"
- Checklist personalizable de secciones
- Botón "Descargar PDF" que filtra las secciones del renderer

#### [MODIFY] `src/features/consultations/lib/pdf/pdf-renderer.ts`
- Aceptar parámetro `sections?: PdfSectionKey[]` para renderizar solo secciones seleccionadas

#### [MODIFY] Componente que actualmente dispara la descarga del PDF
- En vez de llamar directamente al worker, abrir el `PdfSectionSelectorModal` primero

**Impacto SQL:** Ninguno.
**Impacto sync/offline:** Ninguno.

---

## Fase 2 — Lab Orders + Medical Referrals

### 2A. Lab Orders (Órdenes de Laboratorio)

**Flujo:** El médico crea órdenes de lab desde la consulta → se guardan como registros independientes → en la sección de laboratorio de la clínica, el personal busca por cédula del paciente → ve header + exámenes + razón.

> **ADVERTENCIA:** Esta feature requiere **2 nuevas tablas SQL** con RLS, actualización del sync worker (no requerido para Lab Orders, son 100% online), y una nueva sección de la app (`/laboratorio`).

#### SQL — Nueva tabla `lab_orders`
```sql
create table if not exists public.lab_orders (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  doctor_id           uuid not null references auth.users (id) on delete cascade,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  clinical_record_id  uuid references public.clinical_records (id) on delete set null,
  order_type          text not null check (order_type in ('laboratory', 'imaging')),
  items               jsonb not null default '[]',  -- [{name, code?, notes}]
  reason              text not null default '',       -- razón de la referencia
  status              text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  results             jsonb,                          -- resultados subidos por lab
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.lab_orders enable row level security;
```

#### Archivos nuevos
- `src/features/lab-orders/` — nuevo vertical slice completo
  - `types/index.ts`
  - `lib/lab-orders-domain.ts`
  - `lib/use-lab-orders-queries.ts`
  - `components/lab-orders-view.tsx` — vista principal del personal de lab
  - `components/lab-order-patient-header.tsx`
  - `components/lab-order-search.tsx` — búsqueda por cédula
- `src/app/(dashboard)/laboratorio/page.tsx` — nueva ruta

#### Archivos modificados
- `supabase/migrations/000_production_full_schema.sql` — agregar tabla + RLS + índices
- `supabase/migrations/003_lab_orders.sql` — migración incremental
- Wizard de consulta: botón "Enviar a laboratorio" que crea la orden al guardar
- `sync-worker.ts` + `indexeddb.ts` — agregar `lab_orders` como tabla sincronizable

---

### 2B. Medical Referrals (Referencias Médicas)

**Flujo:** Médico refiere a otro médico (ya sea dentro de la misma clínica o un médico externo) → escribe razón → opcionalmente adjunta informe → se genera la referencia.

#### SQL — Nueva tabla `medical_referrals`
```sql
create table if not exists public.medical_referrals (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  referring_doctor_id uuid not null references auth.users (id) on delete cascade,
  referred_doctor_id  uuid references auth.users (id) on delete set null, -- Null for external doctors
  external_doctor_name text, -- Para doctores fuera del sistema
  external_doctor_contact text,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  clinical_record_id  uuid references public.clinical_records (id) on delete set null,
  reason              text not null,
  include_report      boolean not null default false,
  status              text not null default 'pending'
    check (status in ('pending', 'accepted', 'completed', 'declined')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.medical_referrals enable row level security;
```

#### Archivos nuevos
- `src/features/referrals/` — nuevo vertical slice
- Componente de creación de referencia dentro del wizard
- Panel de referencias recibidas/enviadas

---

## Fase 3 — Clinic Admin Dashboard + Cash Flow

### 3A. Clinic Admin Dashboard

**Flujo:** Usuarios con `plan: "clinic"` y `role: "admin"` ven un dashboard totalmente diferente, enfocado en métricas administrativas cross-doctor.

> **DECISIÓN PENDIENTE**: ¿Crear una ruta separada `/clinic-dashboard` o condicionar el mismo `/dashboard` según el rol? Recomendación: **ruta separada** para mantener la separación de concerns.

#### Métricas del dashboard clínico (sin facturación)
- Total doctores activos en la clínica
- Citas del día / semana / mes (aggregate)
- Consultas totales (aggregate por todos los doctores)
- Rendimiento por especialidad: consultas/especialidad, pacientes/especialidad
- Top doctores por volumen de consultas

#### Archivos nuevos
- `src/features/clinic-admin/` — vertical slice independiente
  - `components/clinic-dashboard-view.tsx`
  - `components/clinic-metrics-bar.tsx`
  - `components/clinic-specialty-chart.tsx`
  - `lib/clinic-metrics-domain.ts`
  - `lib/use-clinic-metrics.ts`
- `src/app/(dashboard)/clinic-dashboard/page.tsx`

#### Archivos modificados
- `dashboard-onboarding-guard.tsx` — redirect a `/clinic-dashboard` si `plan === "clinic" && role === "admin"`

### 3B. Cash Flow Control

**Flujo:** Sección `/caja` con análisis de rendimiento financiero: diario, semanal, mensual. Desglose por tipo de consulta, medio de pago, doctor.

> **NOTA:** Los datos de pago ya viven en la tabla `appointments` (`payment_status`, `payment_method`, `amount`, `consultation_type`). No se requiere nueva tabla SQL.

#### Archivos nuevos
- `src/features/cash-flow/` — vertical slice
  - `components/cash-flow-view.tsx`
  - `components/cash-flow-charts.tsx`
  - `lib/cash-flow-domain.ts` — funciones puras de cálculo
  - `lib/use-cash-flow-queries.ts`
- `src/app/(dashboard)/caja/page.tsx`

---

## Fase 4 — Subscription Alerts + Onboarding + Integrations

### 4A. Subscription Expiry Alert
- Banner visual cuando `subscription_expires_at` está a ≤7 días
- No duplicar con el trial banner existente
- Lógica: si `status === "trialing"` → trial banner. Si `status === "active"` y días ≤ 7 → expiry alert.

### 4B. Onboarding Flow Enforcement
- Ya existe `DashboardOnboardingGuard` con `wizard_completed` check
- Mejorar: forzar configuración paso a paso (perfil → especialidad → membrete → listo)
- Bloquear navegación hasta completar todos los pasos

### 4C. Resend Email Toggle
- Toggle en Ajustes para activar/desactivar envío de correos
- Persistir como `ui_preferences.email_notifications_enabled` en profile
- Las API routes de email consultan este flag antes de enviar

### 4D. WhatsApp API Evaluation
- Ya existe `src/lib/whatsapp/whatsapp-formatter.ts` — solo formatea texto para compartir vía `wa.me` link
- Integración directa con WhatsApp Business API requiere: cuenta de Meta Business, número verificado, plantillas aprobadas, servidor de webhooks
- **Recomendación:** Documentar como evaluación técnica, no implementar en esta iteración

---

## Open Questions

1. **Scope de esta sesión:** ¿Empiezo con la Fase 1 completa (Patient Profile Overlay + PDF Print Selector)?
2. **Clinic Admin Dashboard routing:** ¿Ruta separada `/clinic-dashboard` o condicional en `/dashboard`?
3. ~~**Lab orders offline:** ¿Las órdenes de laboratorio deben funcionar offline (sync a IDB) o son online-only?~~ -> **RESUELTO**: 100% online.
4. ~~**Referrals scope:** ¿Las referencias médicas son solo entre doctores de la misma clínica, o también externas?~~ -> **RESUELTO**: Ambas (internas y externas).
5. **Plantillas de consulta (hasta 5):** Ya existe `treatment_templates` sin límite. ¿El límite de 5 es por plan o global?
6. **Formularios por especialidad:** El wizard ya selecciona `specialtyKind`. ¿Auto-detección desde el perfil, o formularios completamente diferentes?

---

## Verification Plan

### Automated Tests
- `npm run lint && npm run typecheck` — 0 errores después de cada fase
- `npm run test` — todos los tests existentes pasan + nuevos tests de dominio
- Tests nuevos Vitest para funciones puras de cada feature

### Manual Verification
- `npm run build` — build de producción exitoso después de cada fase
- Testing visual en `npm run dev` para componentes UI

---

*Plan generado: 2026-05-28 · Rama: `feat/new-feature` desde `develop`*
