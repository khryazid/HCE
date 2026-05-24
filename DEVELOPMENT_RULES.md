# DEVELOPMENT_RULES.md
# Reglas de Desarrollo — Glyphix

> **Versión:** 1.0 · **Generado:** 2026-05-24 · **Mantenido por:** el equipo de desarrollo
>
> Este archivo es la fuente de verdad de las convenciones del proyecto.
> Todo PR que viole estas reglas debe ser rechazado en code review.

---

## Reglas de Nomenclatura

### Archivos y directorios

| Tipo | Convención | Ejemplos |
|------|-----------|----------|
| Componentes React | `kebab-case.tsx` | `patient-list.tsx`, `wizard-stepper.tsx` |
| Hooks | `use-nombre.ts` | `use-consultation-wizard.ts` |
| Utilidades / funciones puras | `kebab-case.ts` | `date-utils.ts`, `sync-worker.ts` |
| Tipos de dominio | `kebab-case.ts` o `index.ts` | `wizard-types.ts`, `types/index.ts` |
| Constantes | `kebab-case.ts` | `wizard-constants.ts`, `app.ts` |
| Contextos React | `kebab-case-context.tsx` | `clinical-context.tsx` |
| Directorios de features | `kebab-case/` | `consultations/`, `patients/` |

> **Regla:** Todos los archivos usan **kebab-case**. Los componentes React son
> kebab-case en el nombre de archivo, PascalCase en el nombre del componente exportado.

### Variables y funciones

| Identificador | Convención |
|---|---|
| Variables y parámetros | `camelCase` |
| Funciones y métodos | `camelCase` |
| Componentes React | `PascalCase` |
| Tipos e interfaces TypeScript | `PascalCase` |
| Constantes globales/módulo | `SCREAMING_SNAKE_CASE` |
| Hooks | prefijo `use` + `camelCase` |

### Tablas y columnas de Supabase (PostgreSQL)

- Tablas: `snake_case` plural (`patients`, `clinical_records`, `specialty_data`)
- Columnas: `snake_case` (`clinic_id`, `doctor_id`, `created_at`)
- RPCs: `snake_case` verbo (`log_audit_event`, `search_global`, `is_super_admin`)
- Índices: `idx_<tabla>_<columnas>` (`idx_patients_clinic_id`)

### Branches de Git

```
<tipo>/<descripcion-en-kebab-case>

Ejemplos:
feat/offline-sync-conflict-resolution
fix/patient-duplicate-on-sync
chore/update-supabase-types
refactor/extract-pdf-worker
docs/development-rules
audit/agente-10-buenas-practicas
```

**Tipos válidos:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `audit`

---

## Reglas de Arquitectura

### Estructura de una nueva feature (Vertical Slice)

```
src/features/<nombre-feature>/
├── components/         # Componentes React propios de la feature
│   └── kebab-case.tsx  # Un componente por archivo
├── lib/                # Hooks, utilidades, lógica de dominio
│   ├── use-*.ts        # Hooks TanStack Query / estado
│   ├── *-domain.ts     # Funciones puras de dominio (sin side effects)
│   ├── *-queries.ts    # Queries y mutations de TanStack Query
│   └── *.ts            # Otras utilidades de la feature
├── types/
│   └── index.ts        # Tipos de dominio de la feature
└── context/            # (opcional) Contextos React propios de la feature
    └── *-context.tsx
```

**Reglas:**
1. Una feature **no importa los internals** de otra feature — solo sus exports explícitos.
2. Si dos features comparten código, ese código va a `src/lib/`.
3. Los componentes en `src/components/ui/` son **agnósticos al dominio**.
4. Las queries de TanStack Query van en `*-queries.ts` dentro de `lib/` de la feature.

### Qué va dónde

| Tipo de código | Ubicación |
|---|---|
| Componentes compartidos sin dominio | `src/components/ui/` |
| Lógica de Supabase (cliente, sesión, perfil) | `src/lib/supabase/` |
| IndexedDB (schema, CRUD) | `src/lib/db/` |
| Sync worker | `src/lib/sync/` |
| Variables de entorno del servidor | `src/lib/env.ts` → `serverEnv` |
| Constantes globales de la app | `src/lib/constants/` |
| Hooks compartidos entre features | `src/lib/hooks/` |
| Observabilidad (loggers, events) | `src/lib/observability/` |
| Lógica específica de una feature | `src/features/<feature>/lib/` |
| API Routes de Next.js | `src/app/api/` |

### Cuándo crear un nuevo hook

**Crear un hook cuando:**
- La lógica tiene side effects (fetch, DOM, subscriptions)
- El estado se necesita en múltiples componentes
- Encapsula una query de TanStack Query

**No crear un hook cuando:**
- La lógica es una función pura → va en `*-domain.ts`
- Es una constante → va en `*-constants.ts`

### Reglas para la capa de sync/offline

1. **Toda escritura** de datos clínicos pasa por `enqueueSyncItem()`.
2. **Toda lectura** prioritaria viene de IndexedDB → refresca desde Supabase en background.
3. Las funciones de `indexeddb.ts` son la única capa que toca IDB directamente.
4. El sync worker (`sync-worker.ts`) es el único que hace flush a Supabase.
5. **Conflictos:** cuando `remoteTime > client_timestamp`, marcar como `"conflicted"`.
6. Toda nueva tabla sincronizable debe agregarse a `TableName`, `TableInsertMap` y `mapPayloadByTable()` en `sync-worker.ts`, y al schema de `indexeddb.ts`.

---

## Reglas de TypeScript

### Prohibiciones

```typescript
// ❌ PROHIBIDO sin justificación
const x: any = ...
(obj as any).method()

// ✅ Si es temporal/necesario, OBLIGATORIO documentar:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Motivo: tipos generados desactualizados — correr `npm run db:types` y eliminar este cast
(supabase as any).rpc("nueva_rpc")
```

### Tipos de Supabase

```typescript
// ✅ Usar tipos generados para operaciones de BD
import type { Database } from "@/types/supabase.types";
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

// ❌ No redefinir manualmente tipos que existen en supabase.types.ts
```

> **Regla:** Correr `npm run db:types` después de **cualquier cambio** en el schema SQL.

### Tipos de dominio

Los tipos de dominio (`PatientRecord`, `ClinicalRecordRecord`, `TenantProfile`) viven en `src/features/*/types/` y son la fuente de verdad en el cliente. Si el schema cambia, deben actualizarse manualmente.

### Tipos de retorno explícitos

```typescript
// ✅ Obligatorio en funciones de src/lib/ que retornan Promises
export async function loadTenantProfile(userId: string): Promise<TenantProfile | null> { ... }

// ✅ Obligatorio en funciones de dominio complejas
export function buildConsultationPayload(input: PayloadInput): ConsultationPayload { ... }
```

### Parámetros no usados

```typescript
// ✅ Prefijo _ para parámetros de API compatibility que no se usan internamente
function refreshClinicalRecords(clinicId: string, _doctorId: string) { ... }
```

---

## Reglas de Seguridad

### Variables de entorno

```typescript
// ✅ Siempre acceder via serverEnv:
import { serverEnv } from "@/lib/env";
const key = serverEnv.STRIPE_SECRET_KEY;

// ❌ NUNCA acceder directamente (sin validación de presencia):
const key = process.env.STRIPE_SECRET_KEY;

// ❌ ABSOLUTAMENTE PROHIBIDO en código cliente:
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

### RLS (Row Level Security)

1. **Toda nueva tabla** debe tener RLS habilitado desde el primer commit.
2. **Toda nueva política RLS** debe verificar `auth.uid()` — nunca confiar en parámetros del cliente.
3. **Nunca** pasar `clinic_id` o `doctor_id` como parámetro de API route — derivarlos de `auth.uid()` en la función SQL.
4. Usar `SUPABASE_SERVICE_ROLE_KEY` **solo** en Server Actions y API Routes de servidor.

### Autenticación en API Routes

```typescript
// ✅ Patrón obligatorio en todo API Route:
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // getUser, no getSession
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // ... resto de la lógica
}
```

> **Importante:** Usar `getUser()` (verifica token con Supabase) en lugar de `getSession()` (usa cache local) para endpoints críticos.

### Variables de entorno en archivos de ejemplo

- Nunca commitear valores reales en `.env.*.example` — solo placeholders como `your_key_here`.

---

## Reglas de Testing

### Cobertura mínima

| Tipo de flujo | Test requerido |
|---|---|
| Nueva feature de negocio crítica | Al menos 1 test E2E (Playwright) |
| Nueva función de dominio pura (`*-domain.ts`) | Al menos 1 test Vitest |
| Nueva API Route | Test de integración o validación manual documentada |
| Cambio en sync worker | Test Vitest del caso modificado |

### Principios de tests

```typescript
// ✅ Tests deterministas — pasar "now" como parámetro
test("isOverdue con fecha explícita", () => {
  const result = buildPendingFollowUp(record, new Date("2030-01-01").getTime());
  expect(result!.isOverdue).toBe(true);
});

// ❌ No depender de estado externo o fecha actual sin mockear
```

### Antes de cada commit

```bash
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # 0 errors
npm run test        # todos los tests pasan
```

> El pre-commit hook de Husky (`lint-staged`) ya ejecuta ESLint automáticamente.
> Pendiente: añadir `tsc --noEmit` al pre-commit hook.

---

## Reglas de Git

### Formato de commits (Conventional Commits)

```
<tipo>(<scope>): <descripción en imperativo>

[cuerpo opcional — explicar el POR QUÉ, no el QUÉ]

[footer opcional — referencias a issues]
```

**Ejemplos:**
```
feat(sync): agregar manejo de conflictos con clock drift
fix(patients): corregir duplicado al sincronizar por cédula
chore(types): regenerar supabase.types.ts tras migración de schema
refactor(wizard): extraer useConsultationSave a hook independiente
```

### Flujo de trabajo

1. **Nunca** hacer push directo a `main`.
2. Todo cambio va en una branch con naming `<tipo>/<descripcion>`.
3. Los Pull Requests requieren:
   - Build limpio en CI (`npm run build` pasa)
   - 0 errores de ESLint
   - 0 errores de TypeScript
   - Los tests existentes pasan
4. Los PRs a `main` requieren al menos 1 review.
5. Usar `squash merge` para mantener el historial de `main` limpio.

---

## Reglas de Documentación

### Cambios de schema de BD

Cada cambio de schema **requiere**:
1. Actualizar `supabase/migrations/000_production_full_schema.sql`
2. Correr `npm run db:types` para regenerar `src/types/supabase.types.ts`
3. Actualizar tipos de dominio en `src/features/*/types/` si corresponde
4. Actualizar `mapPayloadByTable()` en `sync-worker.ts` si la tabla es sincronizada

### Documentación inline

```typescript
// ✅ Comentar el POR QUÉ, no el QUÉ
// M-02: setForm estable — no cierra sobre `records` para evitar re-renders O(n)
// en componentes hijos cada vez que cambia la lista de registros.
const setForm = useCallback(..., []);

// ❌ Comentar el QUÉ (obvio del código)
// Actualiza el formulario
const setForm = useCallback(...);
```

Los módulos de `src/lib/` con funciones no triviales deben tener JSDoc en la función.

### AUDITORIA_GLYPHIX.md

- Cuando un hallazgo se **resuelve completamente**, añadir nota en la sección del agente: `✅ Resuelto: <fecha> — <descripción>`

---

## Configuración del Entorno de Desarrollo

```bash
# Setup inicial
npm install
cp .env.local.example .env.local
# Completar las variables en .env.local

# Desarrollo
npm run dev          # SIEMPRE usar este — NO usar --turbo (incompatible con next-pwa)

# Verificación antes de commit
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Vitest

# Tras cambios en el schema SQL de Supabase
npm run db:types     # Regenera src/types/supabase.types.ts

# Tests E2E (requiere E2E_EMAIL y E2E_PASSWORD en .env.local)
npm run test:e2e
```

> **IMPORTANTE:** Nunca usar `next dev --turbo`. El plugin `next-pwa` es incompatible
> con Turbopack. Si el dev server falla, verificar que no se está usando `--turbo`.

---

*Generado por Agente 10 — Glyphix Audit System v2 · 2026-05-24*
*Revisar y actualizar cuando cambie el stack o las convenciones del equipo.*
