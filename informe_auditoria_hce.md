# 🏥 Informe de Auditoría Técnica — HCE Multiespecialidad

> **Auditor**: Claude Sonnet (Thinking) — Antigravity  
> **Fecha**: 2026-05-05  
> **Versión analizada**: rama principal, build `next@16.2.4 / react@19.2.4`  
> **Alcance**: código fuente completo en `src/`, configuración, dependencias y archivos raíz

---

## Resumen Ejecutivo

El proyecto está **bien estructurado** y sigue buenas prácticas en líneas generales: separación por features, offline-first con IndexedDB + cola de sync, RLS de Supabase, auditoría de eventos y CSP configurado. Sin embargo, se identificaron **5 problemas de seguridad** (2 críticos), **8 problemas de deuda técnica** (entre ellos código muerto y archivos huérfanos), y **7 incoherencias** de código que deben resolverse antes de seguir escalando la plataforma.

---

## 🔴 CRÍTICO — Fallos de Seguridad

### SEC-01 · Email de super-admin hardcodeado en código fuente
**Archivo**: `src/features/admin/actions.ts:8` y `src/app/(dashboard)/admin/admin-client.tsx:473`

```ts
const ADMIN_EMAIL = "khristian.yazid@gmail.com"; // ❌ Expuesto en el repositorio
```

El email del administrador está incrustado literalmente en el código. Cualquiera que tenga acceso al repositorio (colaboradores, forks, leaks) conoce la cuenta de super-admin. Si mañana se cambia el email de administrador hay que hacer un deploy.

**Impacto**: Revelación de PII del propietario, fragilidad operacional.

---

### SEC-02 · Stripe se instancia con fallback `"dummy"` enmascarando errores de ENV
**Archivos**: `src/app/api/stripe/webhook/route.ts:7`, `checkout/route.ts:8`, `portal/route.ts:8`

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy", { ... });
```

Si `STRIPE_SECRET_KEY` no está configurada en producción, Stripe se instancia con la clave `"dummy"`. En lugar de fallar rápido con un error claro, la ruta ejecutará y Stripe devolverá un error de autenticación `401`. Esto **enmascara** un misconfiguration crítico y puede causar que pagos reales fallen silenciosamente.

**Impacto**: Pérdida de ingresos, errores difíciles de diagnosticar en producción.

---

### SEC-03 · VAPID mailto con dominio placeholder en producción
**Archivo**: `src/app/api/push/send/route.ts:9`

```ts
webpush.setVapidDetails(
  "mailto:soporte@tu-dominio.com",  // ❌ Placeholder sin reemplazar
  ...
);
```

El email de contacto VAPID es un placeholder literal `tu-dominio.com`. Técnicamente funciona pero viola el estándar Web Push y puede resultar en notificaciones bloqueadas por los servidores push de Google/Mozilla en el futuro.

---

### SEC-04 · Middleware no protege las rutas `/billing` y `/admin`
**Archivo**: `src/lib/supabase/middleware.ts:61-66`

```ts
const isProtectedRoute =
  request.nextUrl.pathname.startsWith("/dashboard") ||
  request.nextUrl.pathname.startsWith("/pacientes") ||
  request.nextUrl.pathname.startsWith("/consultas") ||
  request.nextUrl.pathname.startsWith("/tratamientos") ||
  request.nextUrl.pathname.startsWith("/ajustes");
  // ❌ Faltan: /billing y /admin
```

Las rutas `/billing` y `/admin` no están en la lista de rutas protegidas del middleware. Si un usuario no autenticado navega directamente a `/admin`, el Server Component llama a `verifySuperAdmin()` que redirige correctamente, pero el middleware no aplica el guard a nivel de red — lo que añade latencia innecesaria y deja una capa de defensa en profundidad sin implementar.

---

### SEC-05 · Múltiples casts `as any` en rutas de API de push sin tipado de DB
**Archivos**: `push/send/route.ts:34,50,63,67` y `push/subscribe/route.ts:41`

```ts
const { data: subs, error } = await (supabase.from("push_subscriptions") as any)
  .select("*");

subs.map(async (sub: any) => { ... })
```

La tabla `push_subscriptions` existe en el schema de Supabase (`supabase.types.ts:251`) pero las rutas hacen cast a `any` para bypassear el tipado. Esto elimina por completo la protección de TypeScript en rutas de servidor que manejan endpoints y claves de cifrado push.

---

## 🟠 ALTO — Deuda Técnica

### DEBT-01 · `src/proxy.ts` es un archivo huérfano — no existe `middleware.ts` en raíz
**Archivo**: `src/proxy.ts`

Next.js espera el middleware en `middleware.ts` (raíz del proyecto o `src/`). El archivo existe como `src/proxy.ts` exportando `proxy()` y `config`, pero **no hay ningún `middleware.ts`** que lo invoque. En consecuencia, **el middleware de autenticación de Supabase no se ejecuta en ninguna request**.

```
src/
  proxy.ts        ← exporta proxy() y config
  ❌ middleware.ts  ← NO EXISTE → el middleware NO corre
```

> [!CAUTION]
> Esto significa que la protección de rutas del middleware actualmente es **inexistente**. Los redirects se hacen solo a nivel de Server Component/Client Component, que es menos seguro y más lento.

---

### DEBT-02 · `src/lib/db/crypto.ts` está completamente abandonado
**Archivo**: `src/lib/db/crypto.ts`

El módulo `crypto.ts` (363 líneas) implementa cifrado AES-GCM 256 con key-wrapping para PHI en IndexedDB. Sin embargo:

- `indexeddb.ts` tiene un comentario explícito: *"Opción B de cifrado: sin cifrado local de PHI. Los datos se almacenan en texto plano en IndexedDB."*
- **No hay ningún import de `crypto.ts`** en el código activo.
- Se decidió conscientemente pasar a texto plano en IDB v2, pero el módulo nunca fue eliminado.

El archivo ocupa 10KB, genera falsa sensación de seguridad y es deuda activa.

---

### DEBT-03 · Plantillas de tratamiento solo en `localStorage` sin respaldo remoto
**Archivo**: `src/features/consultations/lib/treatments.ts`

Las plantillas de tratamiento (`TreatmentTemplate`) se guardan **únicamente en `localStorage`** del navegador. Esto significa:
- Se pierden al limpiar el navegador.
- No funcionan en múltiples dispositivos.
- No se sincronizan con Supabase.
- `listTreatmentTemplates` está en la cola de `useQuery` de React Query — lo que crea la apariencia de que hay un backend, pero el `queryFn` solo lee `localStorage`.

---

### DEBT-04 · SVGs del scaffold de Next.js sin uso
**Directorio**: `public/`

Los archivos `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` son del scaffold por defecto de `create-next-app`. Ninguno está referenciado en el código fuente. Son archivos innecesarios en producción.

---

### DEBT-05 · `src/features/consultations/actions/` es un directorio vacío
**Directorio**: `src/features/consultations/actions/`

El directorio existe pero está completamente vacío. Las actions de consultations están en otros archivos. El directorio vacío no hace daño pero indica estructura planeada que nunca se completó.

---

### DEBT-06 · `src/lib/supabase/000_production_full_schema.sql` en el directorio de código fuente
**Archivo**: `src/lib/supabase/000_production_full_schema.sql`

El schema SQL de producción está dentro de `src/lib/supabase/`. Los archivos SQL de migración deberían vivir en `supabase/migrations/` (que ya existe pero está vacío). Tener el schema en `src/` hace que:
- Se incluya en el bundle de análisis de TypeScript.
- No sea gestionado por las herramientas de Supabase CLI.

---

### DEBT-07 · Husky `prepare` script con versión antigua
**Archivo**: `package.json:10`

```json
"prepare": "husky install"
```

`husky@8.x` usa `husky install` pero la versión en devDependencies es `"^8.0.0"`. Husky v9+ cambió la API a simplemente `husky`. Si se actualiza Husky sin actualizar el script, el CI/CD fallará silenciosamente.

---

### DEBT-08 · `lint-staged` con `git add` deprecated
**Archivo**: `package.json:70`

```json
"lint-staged": {
  "**/*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "git add"   // ❌ Deprecated en lint-staged v10+
  ]
}
```

`git add` en lint-staged es un anti-patrón deprecado hace años. lint-staged gestiona el staging automáticamente.

---

## 🟡 MEDIO — Incoherencias de Código

### INCO-01 · `TenantProfile` tiene dos campos duplicados: `specialty` y `specialties`
**Archivo**: `src/lib/supabase/profile.ts:3-10`

```ts
export type TenantProfile = {
  specialty: string[];    // ← del campo de BD
  specialties: string[];  // ← alias duplicado agregado por withSpecialties()
};
```

`specialties` se genera con `{ ...profile, specialties: profile.specialty }`. Ambos campos tienen el mismo valor. En el código, algunos lugares usan `tenant.specialty`, otros usan `tenant.specialties`. Es confuso y puede causar bugs futuros si se modifican por separado.

---

### INCO-02 · `getSession()` en el cliente CIE vs `getUser()` recomendado
**Archivo**: `src/features/consultations/lib/cie-suggestions-client.ts:57-59`

```ts
const { data: { session } } = await supabase.auth.getSession();
```

El comentario en el código justifica el uso de `getSession()` para obtener el `access_token`. Sin embargo, `getSession()` puede devolver una sesión desactualizada si el refresh token expiró. Para un Bearer token usado en API routes, debería usarse `getUser()` que valida contra el servidor, o simplemente confiar en que el middleware renueva la sesión.

---

### INCO-03 · Coherencia de errores: webhook de Stripe sin verificación de errores de BD
**Archivo**: `src/app/api/stripe/webhook/route.ts:45-52`

```ts
await supabaseAdmin
  .from("profiles")
  .update({ subscription_status: status, ... })
  .eq("stripe_customer_id", customerId);
// ❌ El error de la query no se verifica
```

El resultado del `.update()` no se desestructura ni se verifica. Si la actualización falla (ej: `customerId` no coincide con ningún perfil), el webhook retorna `{ received: true }` y Stripe no reintenta. El estado de suscripción queda inconsistente silenciosamente.

---

### INCO-04 · `listPatientsByTenant` hace fetch directo a Supabase ignorando la arquitectura offline-first
**Archivo**: `src/lib/db/indexeddb.ts:258-290`

La función `listPatientsByTenant` mezcla lógica de UI (fetch a Supabase) dentro de la capa de base de datos local. Esto viola el principio de separación: `indexeddb.ts` debería ser solo storage local; el fetch online-first debería estar en un hook o en el sync worker.

---

### INCO-05 · `SyncQueueItem.action` permite `"insert"` pero el sync worker solo maneja `"delete"` y upsert
**Archivos**: `src/types/sync.ts:1` vs `src/lib/sync/sync-worker.ts:256`

```ts
// sync.ts
type SyncAction = "insert" | "update" | "delete";

// sync-worker.ts
if (item.action === "delete") { ... }
else { /* upsert — aplica tanto a insert como update */ }
```

La acción `"insert"` se almacena en la cola pero el worker la trata igual que `"update"` (upsert). Esto funciona en Postgres, pero la distinción `insert/update` en el tipo no tiene valor real y puede confundir al leer la cola.

---

### INCO-06 · `MAX_RETRY_DELAY_MS` definido dos veces con el mismo valor
**Archivos**: `src/lib/db/indexeddb.ts:20` y `src/lib/sync/sync-worker.ts:17`

```ts
// indexeddb.ts
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

// sync-worker.ts  
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;
```

La misma constante está duplicada en dos archivos. Debería estar en un archivo de constantes compartido.

---

### INCO-07 · Push `/send` endpoint no tiene autenticación de sistema adecuada
**Archivo**: `src/app/api/push/send/route.ts:17-21`

El comentario dice explícitamente: *"In reality, this endpoint could be triggered by Supabase Webhooks or a Cron Job, so you'd want a secure secret header check."* La autenticación actual es solo verificar que haya un usuario autenticado logueado, lo cual no es apropiado para un endpoint que debería ser llamado por sistemas automatizados.

---

## 🔵 BAJO — Observaciones Menores

### OBS-01 · `--webpack` flag en scripts de dev/build puede indicar problemas con Turbopack
**Archivo**: `package.json:6-7`

```json
"dev": "next dev --webpack",
"build": "next build --webpack",
```

El flag `--webpack` fuerza el uso de Webpack en lugar de Turbopack (el nuevo bundler de Next.js 16). Si hay problemas con Turbopack, está bien, pero debería documentarse el motivo.

---

### OBS-02 · `@tanstack/react-query-devtools` incluido como devDependency pero sin lazy loading
Los devtools de React Query solo deberían renderizarse en desarrollo y con lazy loading. Si están importados directamente en `layout.tsx`, se incluyen en el bundle de producción.

---

### OBS-03 · `buildPdfLines()` existe pero solo es llamado por tests (si existen)
**Archivo**: `src/features/consultations/lib/pdf.ts:60`

La función `buildPdfLines()` exporta una versión textual del PDF pero el código de producción usa directamente `generateConsultationPdf()`. Si `buildPdfLines` solo existe para tests, debería marcarse claramente o moverse a un archivo de test.

---

## ✅ Tasklist Ordenada por Prioridad

### 🔴 FASE 1 — CRÍTICO (resolver antes del próximo deploy)

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|------------|----------|
| T-01 | **Crear `src/middleware.ts`** que importe y ejecute `proxy()` de `src/proxy.ts` | `src/middleware.ts` (nuevo) | 🟢 30 min |
| T-02 | **Mover email de admin a variable de entorno** `ADMIN_EMAIL` y leerlo con `process.env` | `src/features/admin/actions.ts` | 🟢 20 min |
| T-03 | **Quitar fallback `"dummy"`** de los 3 archivos de Stripe; lanzar error explícito si `STRIPE_SECRET_KEY` no está definida | `src/app/api/stripe/*/route.ts` | 🟢 20 min |
| T-04 | **Agregar `/billing` y `/admin`** a la lista de `isProtectedRoute` en el middleware | `src/lib/supabase/middleware.ts` | 🟢 5 min |
| T-05 | **Verificar errores del `.update()` de Stripe webhook** y retornar 500 si falla la actualización de BD | `src/app/api/stripe/webhook/route.ts` | 🟢 30 min |

---

### 🟠 FASE 2 — ALTO (resolver en el próximo sprint)

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|------------|----------|
| T-06 | **Eliminar `src/lib/db/crypto.ts`** — está completamente sin uso | `src/lib/db/crypto.ts` | 🟢 5 min |
| T-07 | **Tipar correctamente la tabla `push_subscriptions`** en `supabase.types.ts` y eliminar los `as any` en las rutas push | `push/send/route.ts`, `push/subscribe/route.ts` | 🟡 2h |
| T-08 | **Reemplazar `mailto:soporte@tu-dominio.com`** con variable de entorno `VAPID_MAILTO` | `push/send/route.ts` + `.env.example` | 🟢 15 min |
| T-09 | **Mover `000_production_full_schema.sql`** a `supabase/migrations/` | `src/lib/supabase/000_*.sql` → `supabase/migrations/` | 🟢 10 min |
| T-10 | **Eliminar directorio vacío** `src/features/consultations/actions/` | — | 🟢 2 min |

---

### 🟡 FASE 3 — MEDIO (resolver en el próximo mes)

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|------------|----------|
| T-11 | **Eliminar campo duplicado `specialty`** de `TenantProfile`; renombrar todos los usos a `specialties` | `src/lib/supabase/profile.ts` + consumidores | 🟡 3h |
| T-12 | **Extraer la constante `MAX_RETRY_DELAY_MS`** a `src/lib/constants/` y referenciarla desde ambos archivos | `indexeddb.ts`, `sync-worker.ts` | 🟢 20 min |
| T-13 | **Unificar `SyncAction`**: cambiar `"insert"` a `"upsert"` o eliminar la distinción si no tiene semántica real | `src/types/sync.ts` + `indexeddb.ts` | 🟢 1h |
| T-14 | **Mover el fetch online-first** de `listPatientsByTenant` fuera de `indexeddb.ts` a un hook o al sync-worker | `src/lib/db/indexeddb.ts` | 🟡 2h |
| T-15 | **Agregar autenticación de secret header** al endpoint `/api/push/send` para uso por sistemas automatizados | `push/send/route.ts` + `.env.example` | 🟡 2h |

---

### 🔵 FASE 4 — BAJO (backlog de calidad)

| # | Tarea | Archivo(s) | Esfuerzo |
|---|-------|------------|----------|
| T-16 | **Eliminar SVGs sin uso** del scaffold: `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` | `public/` | 🟢 2 min |
| T-17 | **Corregir `lint-staged`**: eliminar el `git add` deprecated | `package.json` | 🟢 5 min |
| T-18 | **Documentar el flag `--webpack`** en `package.json` o migrar a Turbopack si el bloqueo ya fue resuelto | `package.json` | 🟢 10 min |
| T-19 | **Planificar migración de plantillas de tratamiento** a Supabase para soporte multi-dispositivo | `src/features/consultations/lib/treatments.ts` | 🔴 1 sprint |
| T-20 | **Lazy loading de React Query devtools** con `process.env.NODE_ENV === 'development'` guard | `src/lib/query-provider.tsx` | 🟢 20 min |

---

## Archivos/Módulos Sin Uso Confirmado

| Archivo | Estado |
|---------|--------|
| `src/lib/db/crypto.ts` | ❌ Sin imports en código activo — eliminar |
| `public/next.svg` | ❌ Sin referencias — eliminar |
| `public/vercel.svg` | ❌ Sin referencias — eliminar |
| `public/file.svg` | ❌ Sin referencias — eliminar |
| `public/globe.svg` | ❌ Sin referencias — eliminar |
| `public/window.svg` | ❌ Sin referencias — eliminar |
| `src/features/consultations/actions/` | ❌ Directorio vacío — eliminar |
| `supabase/migrations/` | ⚠️ Directorio vacío — el schema SQL está mal ubicado |

---

## Resumen de Hallazgos

| Categoría | Crítico | Alto | Medio | Bajo | Total |
|-----------|---------|------|-------|------|-------|
| Seguridad | 2 | 3 | — | — | **5** |
| Deuda técnica | — | 5 | 2 | 1 | **8** |
| Incoherencias | — | — | 5 | 2 | **7** |
| **Total** | **2** | **8** | **7** | **3** | **20** |

> El proyecto tiene una base sólida. Los problemas críticos se pueden resolver en menos de **2 horas** de trabajo. La deuda técnica más costosa (plantillas en localStorage, duplicación de `specialty`) requiere planificación de sprint pero no bloquea producción.
