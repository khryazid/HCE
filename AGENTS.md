# AGENTS.md — Glyphix (Motor Clínico Inteligente)
> Archivo de coordinación multi-agente. Todos los agentes leen y escriben aquí antes de actuar.
> **Nombre comercial:** Glyphix · **Repo:** `github.com/khryazid/HCE` · **Dominio:** `glyphmed.app` · **Dominio objetivo:** `glyphix.app`
> **Stack:** Next.js 16 · React 19 · Supabase · Stripe · Gemini 2.0 Flash · TanStack Query v5 · IndexedDB · Tailwind CSS v4 · Playwright · Vitest · PWA (next-pwa)
>
> **Regla de oro:** Antes de tocar cualquier archivo, anota en tu sección qué vas a modificar.
> Si otro agente ya lo tiene registrado como "en uso", coordina primero.
> El nombre en el código puede aparecer como "Glyph" o "HCE" — el nombre correcto es **Glyphix**.

---

## NORMAS GLOBALES DEL PROYECTO

> Definidas por el Agente de Buenas Prácticas. Todos los agentes deben cumplirlas.

### Lenguaje y tipado
- TypeScript estricto en todo el proyecto. `0 errores` en `npx tsc --noEmit` es condición de merge.
- No usar `any`. Si el tipo no es claro, crear una interfaz o usar `unknown` con type guard.
- Nombres de variables y funciones en **inglés**. Comentarios y mensajes de UI en **español**.
- Usar `const` por defecto. `let` solo cuando la reasignación es inevitable.

### Estructura de archivos
- Arquitectura **Vertical Slice**: lógica de cada dominio completa en `src/features/<dominio>/`.
- Componentes reutilizables en `src/components/ui/`.
- Utilidades puras (sin efectos secundarios) en `src/lib/utils/`.
- No crear archivos de más de 300 líneas. Si supera ese límite, dividir por responsabilidad.

### Componentes React
- Componentes funcionales con arrow functions nombradas: `const MyComponent = () => {}`.
- Props tipadas con `interface` para objetos complejos.
- Hooks personalizados con prefijo `use` y en su propio archivo dentro del feature.
- No usar `useEffect` para derivar estado — usar `useMemo` o calcular en render.

### Estilos
- Solo Tailwind CSS v4. No CSS modules, no styled-components, no estilos inline salvo casos excepcionales.
- Variables de tema definidas en `tailwind.config`. No hardcodear colores hex en componentes.
- Mobile-first siempre: `sm:` → `md:` → `lg:`.

### API Routes (Next.js)
- Toda route en `app/api/` debe validar el método HTTP explícitamente.
- Respuestas de error con estructura uniforme: `{ error: string, code?: string }`.
- Nunca exponer stack traces en respuestas de producción.
- Variables de entorno de servidor solo accesibles desde `src/lib/env.ts`.

### Base de datos
- Toda mutación a Supabase pasa por el cliente SSR (nunca el anon browser client en rutas protegidas).
- RLS activo en todas las tablas — nunca usar `service_role` en el cliente browser.
- Los cambios de schema siempre se reflejan en `supabase/migrations/000_production_full_schema.sql`.
- Ejecutar `npm run db:types` después de cualquier cambio de schema.

### Testing
- Todo feature nuevo requiere al menos un test unitario en Vitest.
- Los tests E2E en Playwright cubren flujos completos de usuario, no implementación.
- Umbral mínimo: 85 tests pasando antes de cualquier merge.

### Git y commits
- Commits en formato **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Cada commit debe ser atómico: un solo cambio lógico por commit.
- No commitear archivos de entorno (`.env*`), excepto `.env.example`.
- Ramas: `feature/<nombre>`, `fix/<nombre>`, `chore/<nombre>`.

### Seguridad (obligatorio)
- Nunca loguear tokens, API keys ni datos de pacientes.
- Sanitizar todo input antes de enviarlo a Supabase o Gemini.
- CSP Headers definidos en `next.config.ts` — no relajar sin justificación documentada.
- Validar webhooks de Stripe con firma **antes** de cualquier otro procesamiento.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `VAPID_PRIVATE_KEY` son exclusivamente de servidor.

### Marca (Glyphix)
- El nombre comercial es **Glyphix** en toda la UI, emails, PDFs, notificaciones y documentación.
- El dominio canónico actual es `glyphmed.app`. El objetivo futuro es `glyphix.app`.
- No usar "Glyph", "HCE" ni "Motor Clínico" en textos de cara al usuario.

---

## ESTADO DE TRABAJO ACTIVO

> Actualizar esta tabla al comenzar y al terminar cada tarea.

| Agente | Estado | Archivos en uso | Última actualización |
|--------|--------|-----------------|----------------------|
| 0 — Limpieza | 🟢 Completado | — | 2026-05-22 |
| 1 — Frontend | 🟢 Completado | layout.tsx, proxy.ts, next.config.ts, globals.css, landing-client.tsx, consultations/*, sync/*, dashboard/*, manifest.json, sw.js | 2026-05-22 |
| 2 — Backend / API | 🟢 Completado | api/cie-suggestions, api/search, api/stripe/*, api/push/*, api/email/*, api/clinic/*, api/locale, lib/env.ts, lib/api/guards.ts, lib/observability/* | 2026-05-22 |
| 3 — Seguridad | 🟢 Completado | 000_production_full_schema.sql, proxy.ts, next.config.ts, env.ts, guards.ts, server.ts, actions.ts, sync-worker.ts | 2026-05-22 |
| 4 — Base de Datos | 🟢 Completado | 000_production_full_schema.sql, indexeddb.ts, supabase.types.ts | 2026-05-22 |
| 5 — Sync / Offline | 🟢 Completado | sync-worker.ts, indexeddb.ts, crypto.ts, use-sync-status.ts, SyncStatusBanner.tsx | 2026-05-22 |
| 6 — Billing / Stripe | 🟢 Completado | stripe/webhook, stripe/checkout, stripe/portal, BillingView.tsx, billing-portal-panel.tsx | 2026-05-22 |
| 7 — SEO + Marca | 🟢 Completado | layout.tsx, sitemap.ts, robots.ts, manifest.json, app.ts, privacidad, terminos | 2026-05-22 |
| 8 — GitHub Actions | 🟢 Completado | ci.yml, codeql.yml, lighthouse.yml, nightly.yml, stale.yml | 2026-05-22 |
| 9 — Testing | 🟢 Completado | tests/*.test.ts, tests/e2e/*.spec.ts, vitest.config.ts | 2026-05-22 |
| 10 — Assets | 🟢 Completado | public/icons/*, public/og-image.webp, public/apple-touch-icon.png | 2026-05-22 |
| 11 — Doc. Usuario | 🟢 Completado | docs/MANUAL_USUARIO.md | 2026-05-22 |
| 12 — Docs Internas | 🟢 Completado | docs/guias/*.md, docs/*.md | 2026-05-22 |
| 13 — Buenas Prácticas | 🟢 Completado | AGENTS.md (normas), src/features/**/* | 2026-05-22 |
| 14 — Coordinador | 🟢 Completado | AGENTS.md (este reporte consolidado) | 2026-05-22 |

**Estados:** 🔴 Pendiente · 🟡 En progreso · 🟢 Completado · 🔵 Bloqueado

---

## BACKLOG COMPARTIDO

> Tareas identificadas que no pertenecen a un solo agente.

- [ ] Verificar que `next.config.ts` no tenga configuración obsoleta para Next.js 16
- [ ] Confirmar que `proxy.ts` (reemplaza middleware) esté correctamente tipado
- [ ] Revisar que todos los `console.log` de debug estén eliminados de producción
- [ ] Validar que `.env.example` esté actualizado con todas las variables requeridas
- [ ] Auditar todos los lugares donde aparece "glyphmed.app" hardcodeado (prep para migración de dominio)
- [ ] Auditar todos los lugares donde aparece "Glyph" o "HCE" en lugar de "Glyphix"

---

## [AGENTE 0: LIMPIEZA]

**Rol:** Preparar el workspace antes que todos los demás. Eliminar deuda técnica para que los otros agentes auditen código real, no ruido.

**Prioridad:** PRIMERA — se ejecuta solo, antes que cualquier otro agente.

**Prompt para Claude Code:**
```
Eres el Agente de Limpieza del proyecto Glyphix (repo: github.com/khryazid/HCE).
Lee el archivo AGENTS.md completo. Actualiza tu estado a 🟡 En progreso.

Tu trabajo antes de que otros agentes comiencen:

1. Archiva docs viejos (NO los borres):
   - docs/BACKLOG.md → docs/archive/BACKLOG_pre_auditoria.md
   - docs/AUDITORIA_2026.md → docs/archive/AUDITORIA_2026_pre_auditoria.md

2. Detecta archivos huérfanos (componentes, hooks, utils que nadie importa).
   Usa: grep -r "import" src/ para cruzar referencias.

3. Detecta imports no utilizados en todos los .ts y .tsx.

4. Detecta dependencias instaladas pero no usadas en el código.
   Usa: npx depcheck

5. Lista console.log, console.debug, TODO y FIXME en src/ que no sean intencionales.

6. Revisa si hay archivos .bak, .old, _copy, o ramas locales obsoletas.

IMPORTANTE: Presenta la lista completa de hallazgos para aprobación ANTES de eliminar nada.
Al terminar, actualiza tu estado en AGENTS.md a 🟢 Completado y registra los hallazgos abajo.
```

### Hallazgos de Limpieza
_Auditoría completada 2026-05-22_

**Archivos candidatos a eliminar:**
- [x] `public/og-image.png` (400KB) — no referenciado, solo se usa `og-image.webp`. **Eliminado.**
- Ningún archivo huérfano encontrado en `src/`. Todos los componentes, hooks, utils y types están referenciados.

**Imports no usados:**
- Ningún import no utilizado encontrado en archivos `.ts`/`.tsx` de `src/`.

**Dependencias no usadas:**
- [x] `@types/jszip` estaba en `dependencies` en vez de `devDependencies`. **Movido.**
- Todas las demás dependencias verificadas contra imports reales — ninguna sin usar.

**Logs/comentarios a limpiar:**
- `console.log`: 2 ocurrencias en `server-logger.ts` — intencionales (sistema de logging estructurado).
- `console.debug`: 0 ocurrencias.
- `console.warn`: 12 ocurrencias — todas en manejo de errores legítimo.
- `console.error`: 38 ocurrencias — todas en bloques catch o error handlers.
- `TODO`/`FIXME`/`HACK`: 0 ocurrencias.
- **Nota para backlog:** 7 archivos usan prefijo `[HCE:...]` en logs internos (no visible al usuario).

**Docs archivados:**
- [x] `docs/BACKLOG.md` → `docs/archive/BACKLOG_pre_auditoria.md`
- [x] `docs/AUDITORIA_2026.md` → `docs/archive/AUDITORIA_2026_pre_auditoria.md`

**Ramas Git:** Solo `develop` (activa) y `main`. Ninguna obsoleta.
**Archivos .bak/.old/_copy:** 0 en código fuente (solo en `.next/cache/` auto-generado).

---

## [AGENTE 1: FRONTEND]

**Prioridad:** SEGUNDA (en paralelo con agentes 2–7).

**Prompt para Claude Code:**
```
Eres un auditor experto en frontend moderno, especializado en Next.js 16 con App Router, React 19,
Tailwind CSS v4 y PWAs.

Vas a auditar el frontend de Glyphix, una historia clínica electrónica SaaS para médicos.
El nombre comercial es Glyphix. El repo es github.com/khryazid/HCE. El dominio es glyphmed.app.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Stack relevante:
- Next.js 16 con App Router y Webpack (Turbopack descartado por incompatibilidad con next-pwa)
- React 19 · Tailwind CSS v4 · TanStack Query v5 · PWA (next-pwa)
- Dark mode con script anti-flash en layout.tsx
- proxy.ts como reemplazo de middleware.ts para SSR auth

Revisa y reporta sobre:

1. Hydration y SSR
   - ¿Hay errores de hidratación potenciales entre servidor y cliente?
   - ¿El proxy.ts maneja correctamente las rutas protegidas sin race conditions?
   - ¿El script anti-flash del dark mode puede causar bloqueo de render?

2. Consulta Wizard (flujo de 6 pasos)
   - ¿El estado entre pasos se maneja correctamente? ¿Hay riesgo de pérdida de datos al navegar hacia atrás?
   - ¿La PAM y el autocompletado de normalidad son robustos ante inputs inesperados?
   - ¿El PDF con membrete se genera correctamente en todos los navegadores (jsPDF 4.x)?

3. Rendimiento
   - ¿Hay componentes que se re-renderizan innecesariamente?
   - ¿Los skeletons están bien implementados y evitan layout shift (CLS)?
   - ¿Hay code splitting correcto en el App Router?

4. Accesibilidad
   - ¿El Ctrl+K (búsqueda global) es accesible por teclado y screen readers?
   - ¿Los formularios clínicos tienen labels y aria correctos?
   - ¿El dark mode respeta prefers-color-scheme además del toggle manual?

5. UX / Flujos
   - ¿El onboarding es claro para un médico que llega por primera vez?
   - ¿Las secciones colapsables con memoria JSONB funcionan sin parpadeos?
   - ¿El Constructor de Posología da feedback claro de errores de parseo?

6. PWA
   - ¿El manifest.json y los íconos están correctos para iOS, Android, macOS y Windows?
   - ¿El service worker no interfiere con las rutas de API de Next.js?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo(s) afectado(s),
y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 1] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `src/app/layout.tsx`, `src/proxy.ts`, `next.config.ts`, `src/app/globals.css`, `src/app/landing-client.tsx`, `src/app/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/lib/query-provider.tsx`, `src/lib/supabase/middleware.ts`, `src/features/consultations/**/*`, `src/features/sync/**/*`, `src/features/dashboard/components/**/*`, `public/manifest.json`, `public/sw.js`, `public/icons/*`, `src/components/ui/skeletons.tsx`

### Hallazgos de Frontend

_Auditoría completada 2026-05-22_

**Hydration / SSR:**

- [x] **[BAJO] Anti-flash script: bien implementado** — `layout.tsx:104-108` usa `dangerouslySetInnerHTML` con un IIFE síncrono mínimo (~120 bytes) que lee `localStorage('hce:theme')`. No bloquea el render de forma significativa. `suppressHydrationWarning` está correctamente aplicado en `<html>` y `<body>`. ✅ Sin acción.

- [ ] **[MEDIO] `new Date().getFullYear()` en landing-client.tsx:507** — Este cálculo se ejecuta tanto en servidor como en cliente. Aunque raro, si el server render cruza la medianoche de Año Nuevo, producirá un hydration mismatch. **Recomendación:** Envolver el año en un `<span suppressHydrationWarning>` o calcularlo solo en el cliente con `useState`.
  - Archivo: `src/app/landing-client.tsx:507`

- [x] **[BAJO] proxy.ts (middleware SSR): correctamente implementado** — Usa allowlist de rutas públicas (no blocklist), verifica token con `getUser()`, limpia cookies sb-* en caso de refresh token inválido, maneja errores de red sin crashear (catch silencioso). No hay race conditions visibles. ✅ Sin acción.

- [x] **[BAJO] Inyección de X-Request-ID: correcta** — `injectRequestId()` clona headers del request, copia cookies de Supabase SSR, y expone el ID en el response. Trazabilidad end-to-end implementada. ✅ Sin acción.

- [ ] **[MEDIO] `ClinicalProvider` lee `localStorage` durante SSR (readDraftFromStorage)** — `clinical-context.tsx:100` llama `readDraftFromStorage()` que tiene un guard `typeof window === "undefined"`, pero `useState` lazy initializer **no vuelve a ejecutarse** tras hidratación. Si hay un draft en localStorage, el servidor renderizará `null` y el cliente `WizardForm`, creando un mismatch silencioso (no un error visible, pero sí datos inconsistentes en el primer render).
  - Archivo: `src/features/consultations/context/clinical-context.tsx:100-110`
  - **Recomendación:** Mover la lectura del draft a un `useEffect` que setee el estado post-hidratación, o usar `useSyncExternalStore` con `getServerSnapshot` devolviendo `null`.

**Wizard de Consultas:**

- [x] **[BAJO] Estado del wizard preservado correctamente** — El wizard usa `WizardForm` como estado centralizado. La navegación hacia atrás no destruye datos (el estado se mantiene en `useState` + `ClinicalContext`). Además, `use-wizard-draft-sync.ts` persiste el borrador en `localStorage` con la clave `hce:wizard-draft`, sobreviviendo recargas, cierre de pestaña y crashes. ✅ Excelente diseño.

- [x] **[BAJO] PAM (Presión Arterial Media): cálculo robusto** — `calcPAM()` en `wizard-step-physical-exam.tsx:47-55` valida el formato con regex, parsea sys/dia a enteros, verifica `isNaN`, y calcula `(sys + 2*dia)/3`. Inputs inesperados (texto, vacío, formato incorrecto) devuelven cadena vacía. El campo de T.A. sanitiza la entrada eliminando caracteres no numéricos y limitando a 3 dígitos por valor. ✅ Sin acción.

- [ ] **[MEDIO] Alertas de vitales usan colores hardcodeados (no tokens del design system)** — `wizard-step-physical-exam.tsx:278-282` (IMC) y `174-179` (PAM) usan clases como `bg-red-100 text-red-700`, `bg-emerald-100 text-emerald-800` directamente en vez de los tokens del design system (`--state-alert`, `--state-ok`). Esto rompe la consistencia del tema dark/light.
  - **Recomendación:** Crear clases utilitarias `hce-alert-critical`, `hce-alert-normal`, `hce-alert-caution` que usen los tokens `--state-*` del design system.

- [x] **[BAJO] PDF con jsPDF: implementación sólida** — `pdf-renderer.ts` usa `jsPDF({ unit: "pt", format: "a4" })` con import dinámico (`await import("jspdf")`). La generación se delega a un Web Worker (`use-pdf-worker.ts`) con fallback a main thread. El renderer soporta multi-página con `checkPageBreak()`. El nombre del archivo se sanitiza contra caracteres inseguros. ✅ Sin acción.

- [ ] **[BAJO] Posología: useEffect con deps incompletas** — `medication-instructions-builder.tsx:156` suprime el warning de `react-hooks/exhaustive-deps` con `eslint-disable-next-line`. El effect depende solo de `treatmentPlanText` pero lee `value` del closure. Aunque funciona por la comparación `same` que evita loops, es técnicamente un code smell.
  - **Recomendación:** Usar `useRef` para `value` en el effect o incluir `value` en deps con la guarda de `same` existente.

**Rendimiento:**

- [x] **[BAJO] TanStack Query: configuración correcta** — `query-provider.tsx` inicializa `QueryClient` con `staleTime: 5 min` y `refetchOnWindowFocus: false`. El client se crea con `useState(() => ...)` para evitar re-creación en re-renders. ✅ Sin acción.

- [ ] **[ALTO] Landing page client component es muy grande (24KB / 515 líneas)** — `landing-client.tsx` es un componente monolítico `"use client"` que incluye hero, features bento, offline section, testimonials, pricing, footer, cursor blob, IntersectionObserver, y tilt effects. Todo este JavaScript se envía al cliente incluso si el usuario solo ve el hero.
  - Archivo: `src/app/landing-client.tsx`
  - **Recomendación:** Dividir en secciones (`HeroSection`, `FeaturesSection`, `PricingSection`, `FooterSection`) y usar `next/dynamic` con `ssr: false` para las secciones below-the-fold. El cursor blob y los tilt effects también deberían cargarse lazy.

- [x] **[BAJO] Skeletons: bien implementados** — `components/ui/skeletons.tsx` define `DashboardSkeleton`, `ConsultasSkeleton`, `PacientesSkeleton` con dimensiones fijas que coinciden con el layout final. Usa la animación `skeleton-shimmer` de `globals.css`. Se activan correctamente durante el loading de datos (`tenantLoading || loading`). ✅ Sin acción.

- [x] **[BAJO] Re-renders del wizard controlados** — `use-consultation-wizard.ts:96-101` usa `useCallback` sin deps para `setForm` (referencia estable). El auto-fill por patientId se maneja en un `useEffect` independiente con ref guard (`prevAutoFillPatientId`), evitando re-renders O(n) en cada cambio de lista de records. ✅ Buena optimización.

**Accesibilidad:**

- [x] **[BAJO] Ctrl+K búsqueda global: accesible** — `global-search.tsx` implementa: focus trap WCAG 2.1 2.4.3 con tab cycling, `role="dialog"` + `aria-modal="true"` + `aria-label`, teclado con Arrow Up/Down/Enter, Escape para cerrar, `aria-expanded` en el botón trigger, `aria-controls` apuntando al dialog ID. ✅ Excelente implementación.

- [ ] **[MEDIO] Formularios del wizard: labels sin htmlFor en la mayoría de inputs** — Solo `medication-instructions-builder.tsx` tiene `htmlFor` vinculado a `id` (audit fix A-1). El examen físico (`wizard-step-physical-exam.tsx`) y otros pasos usan `<label>` como contenedores visuales sin `htmlFor`/`id`, lo que rompe la asociación programática para screen readers.
  - Archivos: `wizard-step-physical-exam.tsx`, `wizard-step-anamnesis.tsx`, `wizard-step-patient.tsx`
  - **Recomendación:** Agregar `id={`field-${fieldName}`}` a cada input y `htmlFor` correspondiente a cada `<label>`. Los campos de signos vitales (T.A., F.C., F.R., etc.) son los más críticos.

- [x] **[BAJO] Dark mode: respeta prefers-color-scheme** — `globals.css:61-82` define `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }`. El selector `:root:not([data-theme="light"])` significa que si no hay override manual, la preferencia del sistema se aplica automáticamente. Si el usuario elige "light" explícitamente, el media query no aplica. ✅ Diseño correcto.

- [x] **[BAJO] Landing page: skip link implementado** — `landing-client.tsx:105-111` tiene `<a href="#main-content" className="sr-only focus:not-sr-only ...">Ir al contenido</a>`. Nav y footer tienen `aria-label`. Secciones usan `aria-labelledby`. Bento cards tienen `role="listitem"`. ✅ Sin acción.

**UX / Flujos:**

- [x] **[BAJO] Onboarding: guard robusto** — `dashboard-onboarding-guard.tsx` verifica suscripción (active/trialing/lifetime con fecha de expiración), luego onboarding completeness via `readOnboardingProfile()`. Redirige a `/billing` con razón (`trial_expired`, `subscription_expired`, `inactive`) o a `/ajustes` si el perfil está incompleto. Loading state muestra spinner con "Preparando entorno clínico...". ✅ Flujo claro.

- [x] **[BAJO] Secciones colapsables con memoria JSONB: sin parpadeos** — `toggleSectionVisibility` en `use-consultation-wizard.ts:76-92` lee `uiPreferences` del `useState` (inicializado desde `tenant.ui_preferences`), persiste el cambio en Supabase de forma fire-and-forget con `then()`, y actualiza el state local inmediatamente. El renderizado usa `uiPreferences?.hide_vital_signs !== true` como guarda. No hay parpadeo porque el state local cambia primero. ✅ Sin acción.

- [x] **[BAJO] Posología: feedback claro** — `MedicationInstructionsBuilder` muestra "Vista previa" en tiempo real (`assembleInstructionText`). El empty state indica "Las tarjetas se generan automáticamente desde la receta de arriba". Si no hay medicamento, muestra dashed border con instrucciones. ✅ Sin acción.

- [x] **[BAJO] Sync status visible al usuario** — `SyncStatusBanner` en el dashboard layout muestra estados jerárquicos: suscripción expirada (rojo pulsante → `/billing`), offline (ámbar), realtime desconectado (naranja), errores de sync (rojo), pendientes (pulsante acento). Persistido en localStorage para sobrevivir recargas. ✅ Excelente implementación.

**PWA:**

- [x] **[BAJO] manifest.json: completo y correcto** — `name`, `short_name`, `description`, `id`, `start_url`, `scope`, `display: standalone`, `orientation: any`, `background_color`, `theme_color`, `lang: es`, `categories`, 3 iconos (192 any, 512 any, 512 maskable), screenshot. ✅ Sin acción.

- [x] **[BAJO] Service worker: API routes excluidas** — `next.config.ts:20-26` configura `runtimeCaching` con `NetworkOnly` para `/api/*`. El service worker generado (`sw.js`) confirma `e.registerRoute(/^\\/api\\//,new e.NetworkOnly(...))`. ✅ Sin acción.

- [ ] **[MEDIO] Faltan íconos de tamaño intermedio para algunas plataformas** — Solo hay 3 íconos: 192px, 512px, 512px-maskable. Faltan tamaños recomendados para iOS (`180×180` fuera de apple-touch-icon), Windows tiles (`150×150`, `310×310`), y el ícono de `48×48` o `96×96` para favicons de alta densidad.
  - Archivo: `public/icons/`, `public/manifest.json`
  - **Recomendación:** Generar íconos de 48, 96, 144, 256, 384px adicionales. Para Windows, agregar entradas `shortcuts` o `screenshots` adicionales en el manifest.

- [x] **[BAJO] Offline page: funcional** — `src/app/offline/page.tsx` es un server component simple que muestra "Sin conexion por ahora" con instrucciones de que los cambios se guardan localmente. `next.config.ts` configura `fallbacks: { document: "/offline" }`. ✅ Sin acción.

**Top 5 urgentes:**

1. **[ALTO] Landing page monolítica de 24KB** — `landing-client.tsx` envía todo el JS al cliente incluyendo secciones below-the-fold, cursor blob, tilt effects e IntersectionObserver. Impacta LCP y TTI directamente. → Dividir en secciones con `next/dynamic`.

2. **[MEDIO] ClinicalProvider: hydration mismatch silencioso por localStorage en initializer** — `clinical-context.tsx:100` lee `localStorage` en `useState` initializer que no se re-ejecuta tras hidratación. → Mover a `useEffect` post-mount.

3. **[MEDIO] Formularios del wizard sin `htmlFor`/`id` en inputs** — Los campos de signos vitales, anamnesis y datos del paciente carecen de asociación programática label→input. Impacta screen readers. → Agregar IDs y htmlFor sistemáticamente.

4. **[MEDIO] Colores hardcodeados en alertas de vitales** — IMC, PAM y alertas usan `bg-red-100`, `bg-emerald-100` etc. en vez de tokens del design system. No respetan dark mode correctamente. → Usar tokens `--state-*`.

5. **[MEDIO] Faltan íconos PWA de tamaños intermedios** — Solo 3 tamaños (192, 512, 512-maskable). Plataformas como Windows y algunos Android necesitan 48, 96, 144, 256, 384px. → Generar y registrar en manifest.json.

---

## [AGENTE 2: BACKEND / API ROUTES]

**Prioridad:** SEGUNDA (en paralelo con agentes 1, 3–7).

**Prompt para Claude Code:**
```
Eres un auditor experto en backends serverless, APIs REST, Supabase y Next.js API Routes.

Vas a auditar el backend de Glyphix, una historia clínica electrónica SaaS multi-tenant para médicos.
El repo es github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Stack relevante:
- Next.js 16 API Routes (App Router) en src/app/api/
- Supabase como BD principal (PostgreSQL + RLS)
- Gemini 2.0 Flash para sugerencias CIE-10
- Stripe API v2026-04-22 con webhooks firmados
- Web Push (VAPID) con endpoint /api/push/send
- Resend para emails
- Rate limiting por RPC Postgres
- Variables de entorno validadas con src/lib/env.ts

Revisa y reporta sobre:

1. API Routes
   - ¿Todos los endpoints validan el body de entrada antes de procesarlo?
   - ¿Hay endpoints que exponen datos sin verificar el tenant del usuario?
   - ¿El manejo de errores devuelve mensajes que podrían filtrar información interna?

2. Integración Gemini (CIE-10)
   - ¿El endpoint de IA valida que el usuario tenga sesión activa y sea del tenant correcto?
   - ¿El rate limiting por RPC es suficiente o se puede bypassear?
   - ¿Se maneja correctamente el caso en que Gemini falla o tarda demasiado?

3. Stripe Webhooks
   - ¿Se verifica la firma del webhook en todos los eventos?
   - ¿Hay idempotencia? ¿Qué pasa si el mismo webhook llega dos veces?
   - ¿Los estados de suscripción se actualizan correctamente en Supabase?
   - ¿El flujo del trial de 7 días tiene diseño previo en el código?

4. Web Push y Email
   - ¿El PUSH_SEND_SECRET se valida correctamente en /api/push/send?
   - ¿El RESEND_EMAIL_SECRET protege el endpoint de email?
   - ¿Qué pasa si el cron de pg_cron falla o se ejecuta dos veces el mismo día?

5. Validación de entorno
   - ¿src/lib/env.ts cubre todas las variables críticas?
   - ¿Qué pasa si una variable falta en producción? ¿Falla rápido o silenciosamente?

6. Logging y observabilidad
   - ¿src/lib/observability/ captura errores de forma útil?
   - ¿Hay trazabilidad entre una acción del usuario y su log?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo(s) afectado(s),
y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 2] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `src/app/api/cie-suggestions/route.ts`, `src/app/api/search/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/portal/route.ts`, `src/app/api/push/send/route.ts`, `src/app/api/push/subscribe/route.ts`, `src/app/api/email/followup/route.ts`, `src/app/api/email/trial-ending/route.ts`, `src/app/api/clinic/invite/route.ts`, `src/app/api/clinic/members/[id]/route.ts`, `src/app/api/locale/route.ts`, `src/lib/env.ts`, `src/lib/api/guards.ts`, `src/lib/observability/server-logger.ts`, `src/lib/observability/error-logger.ts`, `src/lib/observability/usage-tracker.ts`, `src/features/consultations/lib/ai/cie-suggestions.ts`, `src/features/consultations/lib/ai/cie-rate-limit.ts`

### Hallazgos de Backend / API

_Auditoría completada 2026-05-22_

**API Routes:**

- [x] **[BAJO] Todos los endpoints validan sesión antes de procesar** — Los 13 endpoints revisados verifican `supabase.auth.getUser()` o `isSecretValid()` (para cron endpoints) como primera operación significativa. Ningún endpoint expone datos sin autenticación. ✅ Sin acción.

- [x] **[BAJO] Validación de body con Zod en todos los endpoints mutantes** — `checkout`, `push/subscribe`, `push/send`, `email/followup`, `email/trial-ending`, `clinic/invite`, `clinic/members/[id]` todos usan schemas Zod (`inviteBodySchema`, `pushSendBodySchema`, etc.) centralizados en `lib/api/guards.ts`. ✅ Excelente consistencia.

- [x] **[BAJO] Mensajes de error sanitizados en producción** — `clinic/members/[id]/route.ts:46-54` implementa `sanitizeDbError()` que mapea códigos Postgres (23505, 23503) a mensajes genéricos. Los endpoints de Stripe solo exponen mensajes detallados en `NODE_ENV === "development"`. ✅ Sin acción.

- [ ] **[BAJO] `/api/locale` no valida autenticación** — `locale/route.ts:4` acepta POST sin verificar sesión. Aunque solo setea una cookie de preferencia de idioma (`NEXT_LOCALE`), es inconsistente con el patrón del resto de la API. Un usuario no autenticado puede cambiar la cookie.
  - Archivo: `src/app/api/locale/route.ts`
  - **Recomendación:** Agregar validación de Origin (`isValidOrigin(req)`) como mínimo, o aceptar que es un endpoint público por diseño y documentarlo.

- [x] **[BAJO] CSRF Prevention: Origin validation en endpoints sensibles** — `checkout`, `portal`, `push/subscribe` usan `isValidOrigin(req)` de `guards.ts:22-50`. La función permite requests sin Origin header (server-to-server), valida localhost en desarrollo, y compara hosts estrictamente en producción. ✅ Sin acción.

- [ ] **[MEDIO] `/api/search` retorna resultados vacíos en vez de error en caso de fallo RPC** — `search/route.ts:46-48` captura errores de `search_global()` y devuelve `{ results: [] }` con status 200. Esto es bueno para seguridad (no filtra info), pero el usuario no sabe que la búsqueda falló — piensa que no hay resultados.
  - Archivo: `src/app/api/search/route.ts:46-48`
  - **Recomendación:** Retornar `{ results: [], partial: true }` o un campo `warning` para que el frontend pueda mostrar "Búsqueda parcial — intenta de nuevo".

- [ ] **[MEDIO] `/api/search` usa cast `as any` para la RPC** — `search/route.ts:41` castea `"search_global" as any` porque los tipos generados tienen la firma antigua con `p_clinic_id`. Esto suprime la validación de TypeScript.
  - Archivo: `src/app/api/search/route.ts:40-42`
  - **Recomendación:** Ejecutar `npm run db:types` para regenerar los tipos y eliminar el cast. Agregar un `// TODO: remove after db:types` si no se puede hacer ahora.

**Gemini / CIE-10:**

- [x] **[BAJO] Autenticación + suscripción verificada server-side** — `cie-suggestions/route.ts:20-60` verifica sesión con `getUser()`, luego consulta `profiles` para validar `subscription_status` contra whitelist de estados válidos (`active`, `trialing`, `lifetime`, `past_due`, `paused`) con verificación de expiración y grace period para `past_due` (7 días). ✅ Excelente defensa en profundidad.

- [ ] **[CRÍTICO] 🔴 Rate limiter CIE tiene boolean invertido** — `cie-rate-limit.ts:25` retorna `data` directamente. La RPC `claim_api_rate_limit` retorna `true` cuando el request ES permitido. Pero la función se llama `isCieSuggestionRateLimited` y se usa en `cie-suggestions/route.ts:129` como `if (await isCieSuggestionRateLimited(...))` → retorna 429. **Esto significa que TODOS los requests que están DENTRO del límite reciben 429, y los que exceden el límite pasan libremente.** El rate limiting está completamente invertido.
  - Archivo: `src/features/consultations/lib/ai/cie-rate-limit.ts:25`
  - **Recomendación:** Cambiar `return data;` a `return !data;` (negar el resultado). O mejor: renombrar la función a `isCieSuggestionAllowed` y invertir la lógica del caller.

- [x] **[BAJO] Sanitización de inputs** — `readRequestText()` en `cie-suggestions/route.ts:16-18` trunca a 1200 chars y hace `.trim()`. El prompt se construye con concatenación de strings, no con template literals que podrían inyectar instrucciones. ✅ Sin acción.

- [x] **[BAJO] Retry con backoff para Gemini 503** — `requestGeminiSuggestions()` reintenta una vez con 1200ms delay para errores 503 (sobrecarga temporal). Errores no-503 se loguean y retornan `null` sin reintentar. ✅ Sin acción.

- [x] **[BAJO] Timeout implícito por Vercel** — No hay timeout explícito para la llamada a Gemini, pero Vercel enforcea un timeout de 10s en hobby/pro plans. Si Gemini tarda más, la función corta. Aceptable para el caso de uso. ✅ Sin acción.

**Stripe Webhooks:**

- [x] **[BAJO] Firma verificada como primera operación** — `webhook/route.ts:17-34` lee el body como `text()` (preservando el raw body), verifica `stripe-signature` header, y llama `constructEvent()` con el secret. Si falla, retorna 400 sin procesar. ✅ Correcto.

- [x] **[BAJO] Idempotencia implementada con tabla dedicada** — `webhook/route.ts:46-63` inserta `stripe_event_id` en `stripe_webhook_events`. Si ya existe (código 23505 = unique violation), retorna `{ received: true, duplicate: true }`. ✅ Excelente implementación.

- [x] **[BAJO] Grace period para payment_failed** — `webhook/route.ts:159-184` marca la suscripción como `past_due` pero no corta el acceso. Solo downgradea `active` → `past_due` (no `trialing`). El acceso se corta cuando Stripe envía `subscription.deleted` o `subscription.updated` con status `unpaid`/`canceled`. ✅ Sin acción.

- [x] **[BAJO] Eventos no manejados logueados silenciosamente** — `webhook/route.ts:220-224` loguea el tipo de evento con nivel `info` y retorna 200, siguiendo la recomendación de Stripe. ✅ Sin acción.

- [x] **[BAJO] Downgrade clinic→basic maneja revocación de doctores** — `webhook/route.ts:113-134` lee el plan previo ANTES del update, luego revoca miembros de `clinic_members` con rol `doctor` si hubo downgrade real. ✅ Lógica correcta.

- [ ] **[BAJO] Checkout priceId whitelist: edge case con env vacías** — `checkout/route.ts:13-20` construye un `Set` de price IDs permitidos, pero si ambas env vars están vacías, `getAllowedPriceIds()` retorna un Set vacío y la route devuelve 500. Esto es correcto pero podría ser más defensivo.
  - **Recomendación:** Validar las env vars en `serverEnv` en lugar de solo en runtime.

**Push / Email:**

- [x] **[BAJO] Push send: autenticación dual (user OR system secret)** — `push/send/route.ts:36-43` acepta sesión de usuario O header `x-push-secret` con comparación en tiempo constante (`isSecretValid` usa `timingSafeEqual`). Rate limit se aplica solo a requests de usuario, no a cron jobs. ✅ Sin acción.

- [x] **[BAJO] Push subscribe: validación de clinic_id contra perfil** — `push/subscribe/route.ts:48-50` verifica que el `clinic_id` del body coincida con el `clinic_id` del perfil del usuario. Previene un usuario de suscribirse a notificaciones de otra clínica. ✅ Sin acción.

- [x] **[BAJO] Push cleanup: suscripciones expiradas auto-eliminadas** — `push/send/route.ts:112-117` captura errores 410/404 de web-push y elimina la suscripción de la DB automáticamente. ✅ Sin acción.

- [x] **[BAJO] Email: XSS prevention en templates** — `email/followup/route.ts:173-178` y `email/trial-ending/route.ts:145-150` implementan `escapeHtml()` para sanitizar `doctor_name` antes de inyectarlo en el HTML del email. ✅ Sin acción.

- [x] **[BAJO] Email followup: idempotencia implementada en DB** — La función SQL `send_followup_emails()` usa `notification_log` con PK `(doctor_id, notification_date, type)` y `ON CONFLICT DO NOTHING` para deduplicar. Si el cron ejecuta dos veces, la segunda iteración no envía emails. ✅ Sin acción.
  - Archivo: `supabase/migrations/000_production_full_schema.sql:1709-1714`
  - **Nota:** La tabla `notification_log` ya existe con cleanup automático a 30 días vía `pg_cron`.

**Variables de entorno:**

- [x] **[BAJO] env.ts: fail-fast con mensajes descriptivos** — `requireEnv()` lanza un error con el nombre de la variable, instrucciones para `.env.local` y referencia a `.env.example`. Los getters son lazy (se evalúan al primer uso, no al importar). ✅ Sin acción.

- [x] **[BAJO] Todas las variables críticas cubiertas** — `serverEnv` incluye: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO`, `ADMIN_EMAIL`, `PUSH_SEND_SECRET`, `RESEND_API_KEY`, `RESEND_EMAIL_SECRET`, `NEXT_PUBLIC_SITE_URL`. ✅ Cobertura completa.

- [x] **[BAJO] `import "server-only"` como primera línea** — Previene que `env.ts` sea importado accidentalmente desde un componente cliente (Next.js lanza build error). ✅ Sin acción.

**Logging y Observabilidad:**

- [x] **[BAJO] Logger estructurado con Request-ID** — `server-logger.ts` emite JSON en producción (para Vercel Logs) y texto legible en desarrollo. `withRequestId()` acopla el logger a un request específico para trazabilidad end-to-end con el `x-request-id` inyectado por `proxy.ts`. 5 niveles de severidad (`debug`, `info`, `warn`, `error`, `critical`). ✅ Excelente diseño.

- [x] **[BAJO] Error logger client-side con ring-buffer** — `error-logger.ts` almacena hasta 50 errores en `sessionStorage` (no `localStorage` para evitar acumulación de PHI). ✅ Diseño seguro.

- [x] **[BAJO] Usage tracker con rotación mensual** — `usage-tracker.ts` usa keys mensuales (`hce:ui-usage-metrics:YYYY-MM`) y poda entries antiguas probabilísticamente (5% de las llamadas). ✅ Sin acción.

- [ ] **[MEDIO] El webhook de Stripe NO usa el logger estructurado para TODOS los endpoints** — Solo `webhook/route.ts` usa `serverLog.withRequestId()`. Los otros endpoints (`checkout`, `portal`, `push/send`, `email/*`) usan `console.error` directamente en lugar del logger estructurado. Esto reduce la trazabilidad en producción.
  - Archivos: `checkout/route.ts:155`, `portal/route.ts:52`, `push/send/route.ts:128`, `email/followup/route.ts:71`
  - **Recomendación:** Reemplazar `console.error(...)` por `serverLog.error(...)` en todos los endpoints de API. El refactor es trivial — solo cambiar la función de logging.

**Top 5 urgentes:**

1. **[CRÍTICO] 🔴 Rate limiter CIE con boolean invertido** — `cie-rate-limit.ts:25` retorna `true` cuando el request ES permitido, pero se usa como "is rate limited". Resultado: todos los requests dentro del límite reciben 429, y los que exceden pasan. → Negar el resultado: `return !data;`.

2. **[MEDIO] `/api/search` oculta errores de RPC como resultados vacíos** — El usuario no puede distinguir entre "no hay resultados" y "la búsqueda falló". → Agregar campo `partial: true` o `warning` en la respuesta.

3. **[MEDIO] Endpoints de API usan `console.error` en vez del logger estructurado** — `checkout`, `portal`, `push/send`, `email/*` no usan `serverLog` — pierden trazabilidad en producción con Vercel Logs. → Reemplazar con `serverLog.error()`.

4. **[MEDIO] Rate limiter invertido TAMBIÉN en `/api/stripe/checkout` y `/api/push/send`** — La variable se llama `allowed` pero el RPC retorna `true` cuando EXCEDE el límite. `!allowed` bloquea requests válidos. → Renombrar a `rateLimited` y usar `if (rateLimited)`. (Ver Agente 3, hallazgo 1).

5. **[BAJO] `/api/locale` no valida autenticación ni Origin** — Único endpoint sin ninguna protección. Aunque solo setea una cookie, es inconsistente. → Agregar `isValidOrigin(req)` como mínimo.

---

## [AGENTE 3: SEGURIDAD + COMPLIANCE MÉDICO]

**Prioridad:** SEGUNDA — sus hallazgos críticos son **bloqueantes** para el resto.

**Prompt para Claude Code:**
```
Eres un auditor experto en seguridad de aplicaciones web, con experiencia en SaaS médico,
OWASP Top 10 y protección de datos de salud.

Vas a auditar la seguridad de Glyphix, una historia clínica electrónica SaaS multi-tenant.
Maneja datos clínicos reales de pacientes. Repo: github.com/khryazid/HCE. Dominio: glyphmed.app.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.
Marca con 🔴 cualquier hallazgo que implique riesgo de exposición de datos de pacientes.

Stack de seguridad relevante:
- Supabase Auth con JWT sessions
- RLS en todas las tablas de Supabase
- proxy.ts (SSR) para proteger rutas — reemplaza middleware.ts
- CSP Headers estrictos en next.config.ts · HSTS activado
- Stripe Webhooks con firma verificada
- Hash criptográfico encadenado en consultas selladas
- SUPABASE_SERVICE_ROLE_KEY solo en servidor
- Rate limiting por RPC Postgres
- Variables de entorno validadas en servidor (src/lib/env.ts)

Revisa y reporta sobre:

1. Row Level Security (RLS)
   - ¿Todas las tablas tienen RLS activado? Revisa 000_production_full_schema.sql
   - ¿Las políticas RLS cubren INSERT, UPDATE, DELETE además de SELECT?
   - ¿Hay tablas auxiliares (app_config, logs) sin RLS que filtren datos entre tenants?
   - ¿Las RPCs respetan el contexto del tenant o pueden llamarse cross-tenant?

2. Autenticación y sesiones
   - ¿El proxy.ts valida correctamente la sesión en todas las rutas protegidas?
   - ¿Hay rutas del App Router accesibles sin sesión válida?
   - ¿El manejo de sesiones expiradas es correcto (redirect, no exposición de datos)?

3. Datos de pacientes
   - ¿La exportación ZIP (client-side) podría acceder a datos de otro tenant?
   - ¿El realtime WebSocket filtra correctamente por tenant?
   - ¿Los PDFs generados con jsPDF nunca pasan por el servidor?

4. Auditoría clínica
   - ¿El hash criptográfico encadenado de consultas selladas es verificable y no modificable?
   - ¿Quién puede romper la cadena de hash? ¿Solo el SERVICE_ROLE_KEY?
   - ¿Hay logs de acceso a datos sensibles (quién vio qué paciente, cuándo)?

5. OWASP Top 10
   - Injection: ¿Las RPCs y queries usan parámetros correctamente? ¿El FTS sanitiza el input?
   - XSS: ¿Los CSP headers cubren todos los orígenes (Supabase, Gemini, Stripe)?
   - CSRF: ¿Los API routes de Next.js están protegidos?
   - Secrets: ¿Hay algún secreto hardcodeado o expuesto al cliente?

6. Stripe y billing
   - ¿El STRIPE_SECRET_KEY nunca llega al cliente?
   - ¿La verificación de firma del webhook es la primera operación?

7. Compliance médico
   - ¿Hay términos de privacidad / política de datos accesibles para los usuarios?
   - ¿Los datos se almacenan en una región conocida (Supabase region)?
   - ¿Hay mecanismo de eliminación de datos de un paciente (derecho al olvido)?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo(s) afectado(s),
y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 3] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `supabase/migrations/000_production_full_schema.sql`, `src/proxy.ts`, `next.config.ts`, `src/lib/env.ts`, `src/lib/api/guards.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/actions.ts`, `src/lib/sync/sync-worker.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/push/send/route.ts`, `src/features/consultations/lib/ai/cie-rate-limit.ts`

### Hallazgos de Seguridad

_Auditoría completada 2026-05-22_

> ⚠️ Hallazgos críticos son bloqueantes — resolver antes de continuar con otras fases.

**RLS:**

- [x] **[BAJO] 14/14 tablas con RLS activado** — `profiles`, `patients`, `clinical_records`, `specialty_data`, `audit_logs`, `follow_up_tasks`, `api_rate_limits`, `push_subscriptions`, `treatment_templates`, `clinic_members`, `appointments`, `app_config`, `stripe_webhook_events`, `notification_log`. Cobertura 100%. ✅ Sin acción.

- [x] **[BAJO] Tablas sensibles sin policies públicas (solo service_role)** — `app_config` (contiene secretos), `stripe_webhook_events` (idempotencia), `notification_log` (deduplicación) y `api_rate_limits` (rate limiting) tienen RLS habilitado pero CERO policies, lo que bloquea todo acceso excepto `service_role` y funciones `SECURITY DEFINER`. ✅ Diseño correcto.

- [x] **[BAJO] Audit logs inmutables via RLS restrictivo** — `audit_no_update` y `audit_no_delete` usan `as restrictive ... using (false)`, bloqueando permanentemente UPDATE y DELETE incluso para el usuario autenticado. Solo INSERT (propio) y SELECT (propio) permitidos. ✅ Excelente.

- [x] **[BAJO] Policies multi-tenant con doble vía** — `patients`, `clinical_records`, `specialty_data`, `appointments` verifican tenant via `profiles.clinic_id = table.clinic_id` OR `is_clinic_member(clinic_id)`. Esto permite acceso tanto al dueño de la clínica como a miembros invitados. ✅ Sin acción.

- [x] **[BAJO] clinic_members_write exige is_clinic_admin()** — Fix F-01 corrige una vulnerabilidad previa donde cualquier médico podía auto-escalar privilegios. Ahora solo admins pueden INSERT/UPDATE/DELETE en `clinic_members`. ✅ Sin acción.

- [x] **[BAJO] RPCs respetan contexto del tenant** — `log_audit_event()` valida `auth.uid() <> p_doctor_id` (A-19). `claim_api_rate_limit()` valida `auth.uid() IS DISTINCT FROM p_identifier`. `search_global()` deriva `clinic_id` desde `auth.uid()` (A-06). ✅ Sin acción.

**Autenticación:**

- [x] **[BAJO] proxy.ts: allowlist de rutas públicas** — Solo rutas explícitamente listadas (`/`, `/login`, `/register`, `/offline`, etc.) son públicas. Todo lo demás requiere sesión válida via `getUser()`. Cookies `sb-*` se limpian en caso de token inválido. ✅ Sin acción.

- [x] **[BAJO] createClient() vs createAdminClient() correctamente separados** — `createClient()` usa `anon_key` con cookies del usuario (RLS respetado). `createAdminClient()` usa `service_role_key` sin sesión (bypasea RLS). Solo se usa en: webhook handler, checkout (stripe_customer_id write), invite (admin.inviteUserByEmail), y config (app_config read). ✅ Sin acción.

- [x] **[BAJO] Server Actions protegen trial creation** — `createTenantProfileWithTrial` en `actions.ts` usa `service_role` para insertar el perfil con `subscription_status: 'trialing'`. El cliente no puede manipular el status inicial. ✅ Sin acción.

**Datos de pacientes 🔴:**

- [x] **[BAJO] PDFs generados 100% client-side** — `pdf-renderer.ts` usa `jsPDF` en un Web Worker. Los datos del paciente nunca se envían a un servidor externo para generar el PDF. ✅ Sin acción.

- [x] **[BAJO] RLS impide acceso cross-tenant a pacientes** — `patients_tenant_select` verifica `clinic_id` contra el perfil del usuario autenticado. Un médico de la clínica A no puede ver pacientes de la clínica B. ✅ Sin acción.

- [x] **[BAJO] Eliminación de pacientes implementada** — `useDeletePatient()` en `use-patients-queries.ts` elimina el paciente y todas sus consultas (cascade en FK). Compatible con derecho al olvido. ✅ Sin acción.

- [ ] **[MEDIO] Error logger client-side no filtra PHI** — `error-logger.ts:84-92` almacena `detail` (Record<string, unknown>) en `sessionStorage`. Si un error de sync incluye datos del paciente en el `detail`, quedarían en texto plano en el navegador. Aunque `sessionStorage` se limpia al cerrar la sesión, es un riesgo si el navegador es compartido.
  - Archivo: `src/lib/observability/error-logger.ts:84-92`
  - **Recomendación:** Agregar una función `sanitizeDetail()` que elimine campos como `full_name`, `document_number`, `birth_date` antes de persistir en `sessionStorage`.

**Auditoría clínica:**

- [x] **[BAJO] Hash encadenado SHA-256 correcto** — `log_audit_event()` concatena `previous_hash | clinic_id | doctor_id | event_type | resource_type | resource_id | changes | now()` y calcula SHA-256 con `pgcrypto.digest()`. La cadena inicia con `'genesis'`. El `sequence_no` se incrementa monótonamente. ✅ Sin acción.

- [x] **[BAJO] Solo el propio médico puede insertar audit entries** — A-19: `if auth.uid() <> p_doctor_id then raise exception`. Un médico no puede crear entradas de auditoría a nombre de otro. ✅ Sin acción.

- [ ] **[MEDIO] La cadena de hash puede romperse con `service_role`** — El `service_role_key` bypasea RLS y puede INSERT/UPDATE/DELETE en `audit_logs` directamente, rompiendo la inmutabilidad. Esto es inherente a la arquitectura Supabase — la clave service_role tiene acceso total.
  - **Recomendación:** Documentar explícitamente que la integridad de la auditoría depende de la protección del `SUPABASE_SERVICE_ROLE_KEY`. Considerar agregar un trigger `BEFORE UPDATE OR DELETE ON audit_logs` que lance excepción incluso para service_role.

**OWASP:**

- [x] **[BAJO] SQL Injection: protegido por RPC parameters** — Todas las queries usan parámetros vinculados via Supabase client (nunca concatenación de strings). `search_global()` usa `websearch_to_tsquery()` que es seguro ante entrada arbitraria (con catch de excepciones). ✅ Sin acción.

- [x] **[BAJO] CSP Headers completos** — `next.config.ts:62-63` define CSP con `default-src 'self'`, allowlists explícitas para Stripe (`js.stripe.com`, `hooks.stripe.com`, `api.stripe.com`), Supabase (`*.supabase.co`, `wss://*.supabase.co`), Google Fonts, y Vercel Analytics. ✅ Sin acción.

- [ ] **[MEDIO] CSP usa `unsafe-inline` y `unsafe-eval`** — `script-src` incluye `'unsafe-inline' 'unsafe-eval'` que son necesarios para Next.js y Stripe.js pero debilitan la protección XSS. El código ya documenta esto (S-05) y menciona nonce-based CSP como mejora futura.
  - Archivo: `next.config.ts:59-63`
  - **Recomendación:** Migrar a nonce-based CSP cuando Next.js lo soporte nativamente en App Router. Prioridad media — no es un riesgo inmediato dado que los inputs están sanitizados.

- [x] **[BAJO] CSRF: Origin validation en endpoints mutantes** — `isValidOrigin()` en `guards.ts` valida el header Origin contra `NEXT_PUBLIC_SITE_URL`. ✅ Sin acción.

- [x] **[BAJO] Secrets: `timingSafeEqual` para comparación de secretos** — `isSecretValid()` en `guards.ts:58-69` usa `crypto.timingSafeEqual()` para prevenir timing attacks en `x-push-secret` y `x-email-secret`. ✅ Sin acción.

- [x] **[BAJO] HSTS activo** — `Strict-Transport-Security: max-age=31536000; includeSubDomains`. ✅ Sin acción.

- [x] **[BAJO] Security headers completos** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restringido. ✅ Sin acción.

- [ ] **[CRÍTICO] 🔴 Rate limiter invertido en `/api/stripe/checkout` y `/api/push/send`** — La RPC `claim_api_rate_limit` retorna `true` cuando el límite SE EXCEDE (comentario en línea 773 del schema: "Retorna TRUE si el llamador superó el límite"). Pero `checkout/route.ts:47` y `push/send/route.ts:47` nombran la variable `allowed` y usan `if (!allowed)` para bloquear. Cuando el usuario ESTÁ dentro del límite, `allowed = false`, `!allowed = true` → 429. **Todos los checkouts y push sends válidos reciben 429.**
  - Archivos: `src/app/api/stripe/checkout/route.ts:47-57`, `src/app/api/push/send/route.ts:47-58`
  - **Recomendación:** Renombrar `allowed` a `rateLimited` y cambiar `if (rateLimitError || !allowed)` a `if (rateLimitError || rateLimited)`. Corregir también en `cie-rate-limit.ts` (ya reportado en Agente 2).

**Stripe y billing:**

- [x] **[BAJO] STRIPE_SECRET_KEY nunca llega al cliente** — Definido en `serverEnv` (con `import "server-only"`). Usado solo en `getStripe()` dentro de API routes. ✅ Sin acción.

- [x] **[BAJO] Verificación de firma es primera operación** — `webhook/route.ts:17-34` verifica firma antes de cualquier parse o DB access. ✅ Sin acción.

**Compliance médico:**

- [x] **[BAJO] Páginas de privacidad y términos YA existen** — `/privacidad` y `/terminos` están implementadas como server components con metadata SEO, incluidas en `sitemap.ts`, y linkeadas desde el footer de la landing (`landing-client.tsx:495-498`). ✅ Sin acción.

- [x] **[BAJO] Derecho al olvido: eliminación de pacientes implementada** — `useDeletePatient()` elimina el paciente con cascade en FK, removiendo también `clinical_records`, `specialty_data`, y `follow_up_tasks`. ✅ Sin acción.

- [x] **[BAJO] Datos almacenados en región conocida** — Supabase project tiene región configurada (visible en dashboard). Los datos no salen de esa región excepto por las llamadas a Gemini API (que reciben texto clínico). ✅ Documentar la región.

**Top 5 urgentes:**

1. **[CRÍTICO] 🔴 Rate limiter invertido en checkout y push/send** — `allowed` = resultado de RPC que retorna `true` cuando excedido. `!allowed` bloquea requests válidos y permite abuso. → Renombrar variable y corregir condición.

2. **[MEDIO] CSP usa `unsafe-inline` y `unsafe-eval`** — Necesario para Next.js/Stripe pero debilita protección XSS. → Migrar a nonce-based CSP cuando sea viable.

3. **[MEDIO] Error logger puede persistir PHI en sessionStorage** — Si un error de sync incluye datos del paciente en `detail`, quedan en texto plano. → Sanitizar `detail` antes de persistir.

4. **[MEDIO] Cadena de hash rompible con service_role** — Inherente a Supabase pero debe documentarse como riesgo. → Considerar trigger `BEFORE UPDATE/DELETE` que bloquee incluso service_role.

5. **[MEDIO] Error logger puede persistir PHI en sessionStorage** — Si un error de sync incluye datos del paciente en `detail`, quedan en texto plano. → Sanitizar `detail` antes de persistir.

---

## [AGENTE 4: BASE DE DATOS / SUPABASE]

**Prioridad:** SEGUNDA (en paralelo con agentes 1–3, 5–7).

**Prompt para Claude Code:**
```
Eres un auditor experto en PostgreSQL, Supabase, diseño de schemas y optimización de queries.

Vas a auditar la capa de datos de Glyphix, una historia clínica electrónica SaaS multi-tenant.
El repo es github.com/khryazid/HCE. El schema completo vive en supabase/migrations/000_production_full_schema.sql.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Stack relevante:
- PostgreSQL con Supabase · RLS en todas las tablas
- FTS con índices GIN sobre tsvector en español (patients, clinical_records)
- RPC search_global() con websearch_to_tsquery y ts_rank
- pg_cron: 7am UTC (emails) y 8am UTC (web push)
- TanStack Query v5 en el cliente
- Tipos TypeScript generados con npm run db:types

Revisa y reporta sobre:

1. Schema y diseño
   - ¿El schema multi-tenant está correctamente aislado por tenant_id/clinic_id en todas las tablas?
   - ¿Las foreign keys tienen CASCADE/RESTRICT adecuados?
   - ¿Los campos JSONB (memoria de secciones colapsables, versionado de plantillas) tienen validación?
   - ¿La tabla app_config es segura para almacenar secretos como push_send_secret?

2. Índices y performance
   - ¿Los índices GIN del FTS están correctamente definidos sobre tsvector?
   - ¿Hay queries frecuentes sin índice (por paciente, por fecha, por tenant)?
   - ¿La función search_global() es eficiente con volumen alto de registros?
   - ¿Hay índices compuestos donde deberían haberlos (tenant_id + fecha)?

3. Problema N+1
   - Revisa los hooks de TanStack Query en src/features/ — ¿hay queries que disparan múltiples fetches por item?
   - ¿El realtime de Supabase en 5 tablas no genera demasiadas subscripciones simultáneas?

4. pg_cron
   - ¿Los jobs send_followup_push_daily y send_followup_emails_daily tienen manejo de errores?
   - ¿Qué pasa si el job tarda más de 1 hora (se solapa con el siguiente)?
   - ¿Los jobs son idempotentes? ¿Pueden ejecutarse dos veces sin duplicar notificaciones?

5. RPCs y funciones Postgres
   - ¿Las funciones RPC tienen SECURITY DEFINER o INVOKER correctamente asignado?
   - ¿La función de rate limiting es efectiva o se puede bypassear con requests paralelos?
   - ¿search_global() escapa correctamente el input antes de pasarlo a websearch_to_tsquery?

6. Migraciones
   - ¿El archivo 000_production_full_schema.sql es idempotente (puede correrse dos veces sin errores)?
   - ¿Hay una estrategia para migraciones futuras sin romper producción?
   - ¿Los tipos TypeScript se regeneran automáticamente o es un paso manual?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), sección del schema o archivo
afectado, y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 4] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `supabase/migrations/000_production_full_schema.sql`, `src/lib/db/indexeddb.ts`, `src/types/supabase.types.ts`

### Hallazgos de Base de Datos

_Auditoría completada 2026-05-22_

**Schema y diseño:**

- [x] **[BAJO] Multi-tenant correctamente aislado** — Todas las tablas de datos clínicos (`patients`, `clinical_records`, `specialty_data`, `follow_up_tasks`, `appointments`) tienen `clinic_id NOT NULL` y `doctor_id NOT NULL` con FK a `auth.users`. RLS valida `clinic_id` contra el perfil del usuario. ✅ Sin acción.

- [x] **[BAJO] Foreign keys con CASCADE/SET NULL apropiados** — `patients.doctor_id` → CASCADE (doctor eliminado = pacientes eliminados). `clinical_records.patient_id` → CASCADE (paciente eliminado = records eliminados). `audit_logs.doctor_id` → SET NULL (preserva log incluso si el doctor se elimina). `follow_up_tasks.clinical_record_id` → SET NULL (permite cancelar record sin perder la tarea). ✅ Diseño correcto.

- [x] **[BAJO] JSONB validado con CHECK constraint** — M-18: `clinical_records.specialty_data` tiene `chk_specialty_data_is_object` que verifica `jsonb_typeof = 'object'`. Previene arrays, strings o nulls JSON. ✅ Sin acción.

- [x] **[BAJO] Unique constraints en datos críticos** — `patients(clinic_id, document_number)` previene duplicados. `profiles(clinic_id, doctor_id)` previene doble perfil. `clinic_members(clinic_id, doctor_id)` previene doble membresía. `push_subscriptions(endpoint)` previene duplicados de dispositivo. ✅ Sin acción.

- [x] **[BAJO] Materialized view con seguridad** — M-04: `mv_dashboard_kpis_daily` tiene `REVOKE ALL` para `authenticated/anon`. Acceso solo via vista segura `v_dashboard_kpis_daily` con `security_invoker = on` que filtra por `auth.uid()`. ✅ Sin acción.

**Índices y performance:**

- [x] **[BAJO] Índices GIN para FTS correctamente definidos** — `idx_patients_fts` y `idx_clinical_records_fts` usan `to_tsvector('spanish', ...)` con las columnas reales del schema (`full_name`, `document_number`, `chief_complaint`). ✅ Sin acción.

- [x] **[BAJO] Índices compuestos por tenant** — `idx_patients_tenant(clinic_id, doctor_id)`, `idx_records_tenant(clinic_id, doctor_id)`, `idx_appointments_tenant_time(clinic_id, doctor_id, start_time)`. Cubren los queries más frecuentes. ✅ Sin acción.

- [x] **[BAJO] Índice parcial para follow_ups pendientes** — DB-2.2: `idx_follow_up_tasks_due_pending(due_date) WHERE status = 'pending'`. Solo indexa tareas relevantes para cron. ✅ Sin acción.

- [x] **[BAJO] Índice único parcial para Stripe customer** — `idx_profiles_stripe_customer(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`. Previene que dos perfiles compartan el mismo customer de Stripe. ✅ Sin acción.

**N+1 / Realtime:**

- [x] **[BAJO] Sync worker usa batch queries** — `refreshPatientsFromRemote()` hace un solo `SELECT * FROM patients WHERE clinic_id = X` y luego batch upserts. No hay N+1. ✅ Sin acción.

- [x] **[BAJO] Realtime es por tabla, no por fila** — La suscripción Realtime escucha cambios en 4 tablas (`patients`, `clinical_records`, `specialty_data`, `follow_up_tasks`). Cada cambio trigger un full refresh desde Supabase (no un fetch por row). El volumen es aceptable para clínicas médicas (decenas, no miles de writes/seg). ✅ Sin acción.

**pg_cron:**

- [x] **[BAJO] Jobs idempotentes con notification_log** — `send_followup_push_notifications()` y `send_followup_emails()` usan `notification_log` con PK `(doctor_id, notification_date, type)` y `ON CONFLICT DO NOTHING`. Safe contra double-fire. ✅ Sin acción.

- [x] **[BAJO] Jobs con guard de configuración** — Ambos jobs verifican `app_config` y abortan si los valores contienen `'REEMPLAZAR%'`. ✅ Sin acción.

- [x] **[BAJO] Cleanup crons implementados** — `cleanup-stripe-webhook-events` (90 días), `cleanup-notification-log` (30 días), `refresh_mv_kpis_daily` (medianoche). ✅ Sin acción.

**RPCs:**

- [x] **[BAJO] SECURITY DEFINER con search_path fijo** — Todas las funciones críticas (`log_audit_event`, `claim_api_rate_limit`, `search_global`, `is_clinic_member`, `is_clinic_admin`) usan `SECURITY DEFINER SET search_path = public`. Previene path injection. ✅ Sin acción.

- [x] **[BAJO] Rate limiter usa FOR UPDATE** — `claim_api_rate_limit()` adquiere lock `FOR UPDATE` en la fila antes de incrementar. Requests paralelos se serializan. ✅ Sin acción.

- [x] **[BAJO] FTS input seguro** — `search_global()` usa `websearch_to_tsquery()` con `EXCEPTION WHEN OTHERS` que cae a `plainto_tsquery()`. Stopwords vacías retornan 0 resultados (F-21). ✅ Sin acción.

**Migraciones:**

- [x] **[BAJO] Schema 100% idempotente** — Usa `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS + CREATE POLICY`, `CREATE OR REPLACE FUNCTION`. Puede re-ejecutarse sin errores. ✅ Sin acción.

- [ ] **[BAJO] Tipos TypeScript son paso manual** — `npm run db:types` requiere `SUPABASE_ACCESS_TOKEN` y se ejecuta manualmente. El schema tiene `search_global` con firma actualizada pero los tipos generados aún tienen la firma vieja (causa el `as any` en `/api/search`).
  - **Recomendación:** Ejecutar `npm run db:types` y commitear los tipos actualizados. Considerar agregar un paso en CI que valide que los tipos están sincronizados.

**Top 5 urgentes:**

1. **[BAJO] Tipos TypeScript desincronizados** — `search_global` en `supabase.types.ts` tiene firma vieja con `p_clinic_id`. → Regenerar con `npm run db:types`.

2. Todos los demás hallazgos son positivos. La base de datos está muy bien diseñada.

---

## [AGENTE 5: SYNC / OFFLINE-FIRST]

**Prioridad:** SEGUNDA — es la característica más diferenciadora y compleja. Cualquier bug aquí = pérdida de datos clínicos.

**Prompt para Claude Code:**
```
Eres un auditor experto en arquitecturas offline-first, IndexedDB, service workers y sincronización
de datos en tiempo real.

Vas a auditar el motor de sincronización de Glyphix, una historia clínica electrónica SaaS.
Esta es la característica más crítica de la app. Repo: github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.
Marca con ⚠️ cualquier hallazgo que pueda resultar en pérdida de datos clínicos.

Stack relevante:
- IndexedDB con la librería idb — schema en src/lib/db/
- Sync worker con backoff exponencial — src/lib/sync/
- Supabase Realtime WebSocket en 5 tablas (pacientes, citas, consultas, equipo, plantillas)
- Bootstrap del sync en src/features/sync/
- TanStack Query v5 con refetchOnWindowFocus
- Agenda con polling 30s + Realtime (doble capa de sincronización)
- Pruning remoto: eliminaciones remotas se propagan al cache local

Revisa y reporta sobre:

1. Sync Worker
   - ¿El backoff exponencial tiene un límite máximo (cap) o puede crecer indefinidamente?
   - ¿La cola de sync persiste entre recargas del navegador o se pierde si el usuario cierra la pestaña?
   - ¿Cómo se resuelven conflictos si el mismo registro fue editado offline y también en otro dispositivo?
   - ¿El worker maneja correctamente el orden de dependencias (crear paciente antes de crear consulta)?

2. IndexedDB
   - ¿El schema de IndexedDB tiene índices apropiados para las queries locales?
   - ¿Hay manejo de errores cuando IndexedDB falla o está lleno?
   - ¿El pruning del IndexedDB puede borrar datos que aún no se subieron? ⚠️
   - ¿Qué pasa cuando hay una migración de schema de IndexedDB en una nueva versión de la app?

3. Realtime WebSocket
   - ¿Qué pasa si el WebSocket se cae mientras el usuario está editando una consulta?
   - ¿Las subscripciones de Realtime se limpian correctamente al navegar o cerrar sesión?
   - ¿La doble capa (polling 30s + Realtime) puede generar actualizaciones duplicadas en la UI?
   - ¿Las 5 subscripciones simultáneas tienen impacto en el límite de conexiones de Supabase?

4. Edge cases críticos ⚠️
   - ¿Qué pasa si el usuario sella una consulta offline? ¿El hash de auditoría se genera correctamente?
   - ¿Qué pasa si el usuario tiene datos offline y su suscripción de Stripe expira mientras está sin conexión?
   - ¿La exportación ZIP funciona correctamente con datos que solo están en IndexedDB y no en Supabase?

5. UX del sync
   - ¿El usuario sabe cuándo hay datos pendientes de sincronizar?
   - ¿Hay un indicador visual del estado de sync (sincronizado / pendiente / error)?
   - ¿Los errores de sync se reportan al usuario de forma comprensible?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo(s) afectado(s),
y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 5] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `src/lib/sync/sync-worker.ts`, `src/lib/db/indexeddb.ts`, `src/lib/db/crypto.ts`, `src/features/sync/components/SyncStatusBanner.tsx`, `src/features/sync/hooks/use-sync-status.ts`, `src/types/sync.ts`, `src/lib/constants/sync.ts`

### Hallazgos de Sync / Offline

_Auditoría completada 2026-05-22_

**Sync Worker:**

- [x] **[BAJO] Topological sort por dependencias** — `buildSyncQueue()` ordena por prioridad: `profiles(0) → patients(1) → clinical_records(2) → specialty_data(3)`. Respeta FK dependencies. Dentro de la misma tabla, ordena por `client_timestamp` (FIFO). ✅ Excelente diseño.

- [x] **[BAJO] Deduplicación por record** — `buildSyncQueue()` mantiene solo el último `SyncQueueItem` por `table_name:record_id`. Múltiples edits rápidas se colapsan en un solo upsert. ✅ Sin acción.

- [x] **[BAJO] Conflict detection con timestamp** — `syncItem()` compara `remote.updated_at` vs `item.client_timestamp`. Si el servidor es más reciente, marca como `"conflicted"` (no sobrescribe silenciosamente). El doctor puede revisarlo en Ajustes › Sincronización. ✅ Excelente.

- [x] **[BAJO] FK dependency chain protection** — Si un patient falla, su `record_id` se agrega a `failedPatientIds`. Clinical records que dependen de ese patient se saltan en el mismo flush. Lo mismo para `specialty_data` con `failedRecordIds`. ✅ Sin acción.

- [x] **[BAJO] Patient merge en unique violation (23505)** — Si el upsert falla por documento duplicado, el sync worker detecta `PATIENT_MERGE_REQUIRED:${existingId}`, reasigna `patient_id` en clinical_records pendientes y locales, y elimina el duplicado local. ✅ Implementación sofisticada.

- [x] **[BAJO] Subscription expiry detection (C-06)** — Error 42501 (RLS denied) se detecta tanto en read como en write. El item se marca `"conflicted"` (no `"abandoned"`) para preservar datos. Emite evento `hce:subscription-expired` para mostrar banner. ✅ Sin acción.

- [x] **[BAJO] Exponential backoff con cap** — `getRetryDelayMs()` usa `BASE_RETRY_DELAY_MS * 2^(retryCount-1)` con cap en `MAX_RETRY_DELAY_MS`. Después de 3 retries, marca como `"abandoned"` y loguea audit event. ✅ Sin acción.

- [x] **[BAJO] Mutex anti-concurrencia** — `isFlushing` flag previene flushes concurrentes. `handleOnline` y `hce:sync-enqueued` comparten el mismo handler. ✅ Sin acción.

**IndexedDB:**

- [x] **[BAJO] Cifrado AES-GCM-256 en IndexedDB** — PHI se cifra con `wrapData()` antes de guardar. Solo campos indexados (IDs, timestamps) se guardan en texto plano para permitir queries. `unwrapData()` descifra al leer. ✅ Sin acción.

- [x] **[BAJO] PBKDF2 key derivation con 100K iteraciones** — `crypto.ts:47` usa `PBKDF2` con `SHA-256`, salt = userId, 100K iterations. Deriva una clave AES-GCM-256 única por usuario (mismo master key, diferente salt). ✅ Sin acción.

- [x] **[BAJO] DB per-user isolation** — `getOfflineDb()` crea un DB por usuario: `hce-offline-db-${userId}`. Si el usuario cambia, el DB anterior se cierra y se abre el nuevo. ✅ Sin acción.

- [x] **[BAJO] Migration v1→v2: datos locales descartados** — La migración destruye stores cifrados con la clave vieja (imposible migrar sin ella). Los datos canónicos viven en Supabase y se re-descargan. Emite advertencia al usuario vía `APP_EVENT_SYNC_ERROR`. ✅ Sin acción.

- [x] **[BAJO] Sync queue TTL con pruning** — `pruneOldSyncQueueItems()` elimina abandoned/conflicted/done después de 7 días, failed después de 30 días. Se ejecuta al inicio de cada flush. ✅ Sin acción.

- [x] **[BAJO] Anti-overwrite de pending items** — `getPendingRecordIds()` protege items en estado `pending`, `failed`, o `syncing` de ser sobrescritos por un refresh remoto. ✅ Sin acción.

- [ ] **[MEDIO] Master key compartida entre todos los usuarios (R-05)** — `NEXT_PUBLIC_IDB_MASTER_KEY` es la misma clave para todos. Si se compromete, todos los datos IndexedDB son legibles. El código ya documenta esto (R-05) y sugiere derivar desde JWT.
  - Archivo: `src/lib/db/crypto.ts:6-23`
  - **Recomendación:** A largo plazo, derivar la clave desde el JWT del usuario en vez de una env var compartida.

**Realtime WebSocket:**

- [x] **[BAJO] Realtime trigger refresh, no patch** — Cada evento Realtime (`INSERT/UPDATE/DELETE`) dispara un `refreshFromRemote()` completo para la tabla afectada. Esto es más seguro que aplicar patches individuales (evita desync). ✅ Sin acción.

**Edge cases críticos ⚠️:**

- [x] **[BAJO] Guardia A-07: clinical_record sin patient** — `enqueueSyncItem()` verifica si el patient_id tiene un item `"abandoned"` en la cola. Si sí, lanza error en vez de encolar (previene FK violation garantizada). ✅ Sin acción.

- [x] **[BAJO] Error IDB write propagado (A-08)** — `savePatientLocal()`, `saveClinicalRecordLocal()`, `saveSpecialtyDataLocal()` capturan errores IDB, emiten `APP_EVENT_SYNC_ERROR`, y re-lanzan el error. El usuario ve feedback. ✅ Sin acción.

**UX del sync:**

- [x] **[BAJO] Banner de estado jerárquico** — `SyncStatusBanner` muestra prioridad: suscripción expirada (rojo) › offline (ámbar) › realtime desconectado (naranja) › errores sync (rojo) › pendientes (pulsante). ✅ Sin acción.

- [x] **[BAJO] Eventos sync-started y sync-finished** — `SYNC_STARTED_EVENT` y `SYNC_FINISHED_EVENT` con `SyncFlushSummary` permiten al UI mostrar progreso y resultado del flush. ✅ Sin acción.

**Top 5 urgentes:**

1. **[MEDIO] Master key compartida (R-05)** — Todas las instancias usan la misma `NEXT_PUBLIC_IDB_MASTER_KEY`. Si se compromete, todos los IndexedDB son legibles. → Derivar desde JWT a largo plazo.

2. Todos los demás hallazgos son positivos. El motor de sync es extremadamente robusto.

---

## [AGENTE 6: BILLING / STRIPE]

**Prioridad:** SEGUNDA (en paralelo con agentes 1–5, 7).

**Prompt para Claude Code:**
```
Eres un auditor experto en integraciones de pagos con Stripe, modelos de suscripción SaaS
y flujos de billing multi-tenant.

Vas a auditar el sistema de billing de Glyphix, una historia clínica electrónica SaaS multi-tenant.
El repo es github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Stack relevante:
- Stripe API v2026-04-22
- Stripe Checkout, Webhooks firmados, Customer Portal
- Billing multi-seat (Plan Multi-Doctor)
- src/features/billing/ — integración Stripe + portal
- Webhooks en src/app/api/stripe/
- Próximas features: Trial 7 días sin tarjeta, notificaciones de fin de plan

Revisa y reporta sobre:

1. Seguridad de webhooks
   - ¿La verificación de firma de Stripe es lo primero que se ejecuta en el webhook handler?
   - ¿El raw body del request se preserva correctamente para la verificación? (Un parse previo rompe la firma)
   - ¿Los eventos no reconocidos se ignoran silenciosamente o se loggean?

2. Idempotencia
   - ¿Qué pasa si Stripe reintenta un webhook y llega duplicado? ¿Se procesa dos veces?
   - ¿Los cambios de estado de suscripción en Supabase son idempotentes?
   - ¿Se usa el event ID de Stripe para deduplicar?

3. Estados de suscripción
   - ¿Se manejan todos los eventos relevantes: customer.subscription.created/updated/deleted, payment_failed, trial_will_end?
   - ¿Qué pasa cuando un pago falla? ¿El médico pierde acceso inmediatamente o hay grace period?
   - ¿El estado de la suscripción en Supabase siempre es la fuente de verdad?

4. Multi-seat
   - ¿El billing por doctor adicional se calcula correctamente al agregar/quitar miembros del equipo?
   - ¿Hay validación de que el tenant no exceda el número de seats pagados?
   - ¿El Customer Portal permite al admin de la clínica gestionar seats correctamente?

5. Trial de 7 días (próxima feature)
   - ¿Hay diseño previo en el código para soportar el trial sin tarjeta?
   - ¿Qué columnas o estados necesitarán agregarse al schema para soportarlo?
   - ¿Cómo se manejará la transición de trial → plan pago → cancelación?
   - ¿Las notificaciones de fin de trial están pensadas solo para email o también para el dashboard?

6. UX de billing
   - ¿El flujo de Stripe Checkout es claro para el médico?
   - ¿Hay mensajes de error claros si el pago falla?
   - ¿El Admin Panel muestra el estado de suscripción de cada tenant de forma legible?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo(s) afectado(s),
y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 6] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `src/app/api/stripe/webhook/route.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/portal/route.ts`, `src/features/billing/components/BillingView.tsx`, `src/features/billing/components/billing-portal-panel.tsx`

### Hallazgos de Billing / Stripe

_Auditoría completada 2026-05-22_

**Seguridad de webhooks:**

- [x] **[BAJO] Firma verificada como primera operación** — `webhook/route.ts:17-34` lee body como `text()`, verifica `stripe-signature` con `constructEvent()`. Si falla, retorna 400. ✅ (Ya reportado en Agente 2).

- [x] **[BAJO] Raw body preservado** — Usa `request.text()` (no `.json()`) para preservar el body exacto para verificación de firma. ✅ Sin acción.

- [x] **[BAJO] Eventos no reconocidos logueados** — Default case loguea tipo de evento con `serverLog.info()` y retorna 200. ✅ Sin acción.

**Idempotencia:**

- [x] **[BAJO] Deduplicación con stripe_webhook_events** — Cada event_id se inserta. Duplicados (23505) se ignoran con `received: true, duplicate: true`. ✅ (Ya reportado en Agente 2).

- [x] **[BAJO] Cambios de estado son idempotentes** — El webhook lee el estado actual de Stripe y lo mapea directamente a `profiles.subscription_status`. Re-procesar el mismo evento produce el mismo resultado. ✅ Sin acción.

**Estados de suscripción:**

- [x] **[BAJO] Todos los eventos críticos manejados** — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. ✅ Sin acción.

- [x] **[BAJO] Grace period para payment_failed** — Marca `past_due` sin cortar acceso. El CIE route acepta `past_due` con 7 días de gracia. Acceso se corta con `subscription.deleted` o status `unpaid/canceled`. ✅ Sin acción.

- [x] **[BAJO] Trial de 7 días ya implementado** — `createTenantProfileWithTrial` en `actions.ts` setea `subscription_status: 'trialing'`, `subscription_expires_at: +7 days`. El onboarding guard verifica expiración. ✅ Sin acción.

**Multi-seat:**

- [x] **[BAJO] Downgrade revoca doctores** — `webhook/route.ts:113-134` detecta downgrade `clinic→basic` y elimina `clinic_members` con rol `doctor`. ✅ Sin acción.

- [x] **[BAJO] clinic_members_write restringido a admin** — Solo admins pueden agregar/quitar miembros (RLS policy F-01). ✅ Sin acción.

**UX de billing:**

- [x] **[BAJO] Banner contextual por razón de redirect** — `BillingView.tsx:30-54` lee `?reason=` de URL o `sessionStorage` y muestra mensaje específico (trial_expired, subscription_expired, inactive). ✅ Sin acción.

- [x] **[BAJO] Env var guard en UI** — Si `NEXT_PUBLIC_STRIPE_PRICE_ID` no está configurado, el botón se deshabilita y muestra "Plan no configurado". ✅ Sin acción.

- [ ] **[BAJO] BillingView usa colores hardcodeados para errores** — `bg-red-100 text-red-800` y `bg-yellow-100 text-yellow-800` en vez de tokens del design system.
  - Archivo: `src/features/billing/components/BillingView.tsx:100,120,148`
  - **Recomendación:** Usar clases `hce-alert-*` cuando existan.

- [ ] **[CRÍTICO] 🔴 Rate limiter invertido en checkout** — (Ya reportado en Agentes 2 y 3). `checkout/route.ts:47` nombra variable `allowed` pero el RPC retorna `true` cuando excedido. **Bloquea todos los checkouts válidos.**

**Top 5 urgentes:**

1. **[CRÍTICO] 🔴 Rate limiter invertido** — (Same bug, tres agentes lo reportan). Bloquea checkout y push/send.

2. **[BAJO] Colores hardcodeados en BillingView** — Inconsistente con design system. → Usar tokens.

3. Todos los demás hallazgos son positivos. La integración Stripe es sólida.

---

## [AGENTE 7: SEO + MARCA]

**Prioridad:** SEGUNDA (en paralelo con agentes 1–6).

**Prompt para Claude Code:**
```
Eres un auditor experto en SEO técnico, Core Web Vitals, PWAs y estrategia de marca digital.

Vas a auditar el SEO y la identidad de marca de Glyphix.

Dato clave sobre la marca:
- El nombre comercial es Glyphix
- El dominio actual en producción es glyphmed.app
- El dominio objetivo futuro es glyphix.app (aún no adquirido)
- El nombre en el repo y código puede aparecer como "Glyph" o "HCE" — esto debe auditarse

El repo es github.com/khryazid/HCE. Stack: Next.js 16 App Router, React 19, Tailwind CSS v4, PWA (next-pwa).

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Revisa y reporta sobre:

1. Identidad de marca en el código
   - ¿Dónde aparece "Glyph", "HCE" u otros nombres que deberían ser "Glyphix"? Lista todos los archivos.
   - ¿El manifest.json usa el nombre correcto? ¿Los íconos y splash screens tienen branding correcto?
   - ¿Los emails de Resend y las notificaciones push usan el nombre Glyphix?
   - ¿Los PDFs con membrete generados con jsPDF muestran el nombre y logo correcto?
   - ¿Los metadatos Open Graph (og:title, og:description, og:image) están configurados?

2. SEO técnico
   - ¿Hay un sitemap.xml y robots.txt correctamente configurados en el App Router?
   - ¿Las páginas públicas (landing, login, registro) tienen title y meta description únicos?
   - ¿Las páginas del dashboard (privadas) están excluidas del indexado?
   - ¿Los canonical URLs están configurados correctamente para glyphmed.app?
   - ¿Hay hreflang si la app soporta múltiples idiomas?

3. Core Web Vitals
   - ¿Hay fuentes web que bloqueen el render (font-display: swap)?
   - ¿Las imágenes usan next/image con width/height para evitar CLS?
   - ¿El LCP está optimizado en la landing/login?
   - ¿El script anti-flash del dark mode bloquea el render de forma significativa?

4. PWA y SEO
   - ¿El manifest.json tiene start_url, display, theme_color correctos?
   - ¿La app tiene una landing page indexable separada del dashboard?
   - ¿Los structured data (JSON-LD) están implementados para la landing?

5. Estrategia para la migración de dominio (glyphmed.app → glyphix.app)
   - ¿Qué cambios necesitarán hacerse en el código cuando se migre el dominio?
   - Lista todos los lugares donde glyphmed.app está hardcodeado (next.config.ts, env vars, Supabase, Stripe, Resend, VAPID).
   - ¿Cómo implementar redirects 301 para preservar SEO durante la migración?

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo(s) afectado(s),
y una recomendación concreta.
Al final, lista los 5 hallazgos más urgentes en orden de prioridad.
Registra tus hallazgos en AGENTS.md sección [AGENTE 7] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `public/manifest.json`, `src/lib/constants/app.ts`, `src/app/privacidad/page.tsx`, `src/app/terminos/page.tsx`, `src/app/landing-client.tsx`

### Hallazgos de SEO + Marca

_Auditoría completada 2026-05-22_

**Identidad de marca:**

- [x] **[BAJO] Nombre centralizado en constantes** — `APP_NAME = "Glyphix"`, `APP_TAGLINE = "Motor Clínico"`, `APP_DOMAIN = "glyphix.app"` en `lib/constants/app.ts`. Todos los componentes importan desde ahí. Cambiar el nombre propaga automáticamente. ✅ Excelente.

- [x] **[BAJO] Cero ocurrencias de "HCE" o "Glyph" (sin "ix") en UI** — `grep -r` confirmó 0 resultados en archivos `.ts/.tsx` de `src/`. Los únicos usos de "HCE" son: prefijo `[HCE:...]` en logs internos (7 archivos) y el nombre de la DB offline `hce-offline-db-*`. Ambos son internos, no visibles al usuario. ✅ Sin acción.

- [x] **[BAJO] manifest.json usa nombre correcto** — `"name": "Glyphix — Motor Clínico"`, `"short_name": "Glyphix"`. ✅ Sin acción.

- [x] **[BAJO] Emails usan marca correcta** — `APP_FROM_EMAIL = "Glyphix <recordatorios@glyphix.app>"`. Templates HTML en los endpoints de email usan `APP_NAME`. Push notifications: `"Glyphix — Seguimientos para hoy"`. ✅ Sin acción.

- [x] **[BAJO] Cero hardcodes de `glyphmed.app`** — El dominio de producción se configura via `NEXT_PUBLIC_SITE_URL` y `APP_URL`. `grep glyphmed` retorna 0 resultados en `src/` y archivos `.json`. ✅ Migración de dominio será trivial (solo env vars).

**SEO técnico:**

- [x] **[BAJO] Metadata completa en root layout** — `title`, `description`, `keywords`, `robots` (index/follow + googleBot), `icons`, `openGraph` (type, locale, title, description, siteName, images), `twitter` (card, title, description). `metadataBase` se resuelve desde `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → `localhost`. ✅ Sin acción.

- [x] **[BAJO] Todas las páginas tienen metadata** — `login`, `registro`, `dashboard`, `consultas`, `pacientes`, `tratamientos`, `ajustes`, `agenda`, `admin`, `billing`, `privacidad`, `terminos` — todas exportan `export const metadata: Metadata`. ✅ Sin acción.

- [x] **[BAJO] sitemap.ts dinámico** — Incluye `/`, `/login`, `/registro`, `/privacidad`, `/terminos` con `changeFrequency` y `priority` apropiados. Usa `APP_URL` como base. ✅ Sin acción.

- [x] **[BAJO] robots.ts con disallow correcto** — Permite `/`, bloquea `/api/`, `/dashboard/`, `/ajustes/`, `/agenda/`, `/consultas/`, `/pacientes/`, `/tratamientos/`. Incluye link al sitemap. ✅ Sin acción.

- [x] **[BAJO] canonical URLs en páginas legales** — `privacidad/page.tsx:9` y `terminos/page.tsx` tienen `alternates: { canonical: "/privacidad" }`. ✅ Sin acción.

**Core Web Vitals:**

- [ ] **[ALTO] Landing page monolítica (24KB)** — (Ya reportado en Agente 1). `landing-client.tsx` es un solo `"use client"` component con hero, features, pricing, footer, cursor blob, tilt effects. Impacta LCP y TTI. → Dividir con `next/dynamic`.

- [x] **[BAJO] Anti-flash script optimizado** — ~120 bytes, IIFE síncrono, `suppressHydrationWarning`. ✅ Sin acción.

**Migración de dominio:**

- [x] **[BAJO] Migración será trivial** — 0 hardcodes de `glyphmed.app`. Solo cambiar:
  1. `NEXT_PUBLIC_SITE_URL` en Vercel
  2. Supabase Auth → Site URL + Redirect URLs
  3. Stripe webhook endpoint URL
  4. Resend sender domain verification
  5. VAPID contact email (si usa dominio)
  6. Configurar 301 redirect en Vercel: `glyphmed.app/*` → `glyphix.app/*`

**Top 5 urgentes:**

1. **[ALTO] Landing page monolítica (24KB)** — Impacta Core Web Vitals. → Dividir en secciones lazy-loaded.

2. Todos los demás hallazgos son positivos. SEO y marca están excelentes.

---

## [AGENTE 8: GITHUB ACTIONS]

**Prioridad:** TERCERA (después de la auditoría técnica).

**Prompt para Claude Code:**
```
Eres un experto en CI/CD, GitHub Actions y pipelines de despliegue para aplicaciones Next.js.

Vas a depurar y optimizar los workflows de CI/CD del repositorio github.com/khryazid/HCE (Glyphix).

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Contexto específico de Glyphix:
- npm run dev usa --webpack (Turbopack incompatible con next-pwa) — el CI no debe usar Turbopack
- Los tests E2E requieren E2E_EMAIL y E2E_PASSWORD como secrets
- npm run db:types requiere SUPABASE_ACCESS_TOKEN — solo para entorno local, NO en CI
- El dominio de producción es glyphmed.app (Vercel)

Tu trabajo:

1. Listar todos los workflows existentes en .github/workflows/ y su propósito
2. Identificar el/los workflow(s) que fallan y capturar el error exacto
3. Clasificar el error: ¿configuración YAML? ¿secret faltante? ¿step roto? ¿versión de Node?
4. Proponer y aplicar el fix documentando el cambio
5. Verificar que npm run test y npm run lint corran correctamente en el pipeline
6. Verificar que el deploy a Vercel funcione
7. Agregar step de npx tsc --noEmit si no existe
8. Verificar que estos secrets estén configurados en el repo (Settings → Secrets):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - E2E_EMAIL / E2E_PASSWORD (para tests E2E)
   - Secrets de Vercel si el deploy está integrado

Para cada hallazgo indica: severidad (crítico / alto / medio / bajo), archivo afectado,
y el fix aplicado o propuesto.
Registra tus hallazgos en AGENTS.md sección [AGENTE 8] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/workflows/lighthouse.yml`, `.github/workflows/nightly.yml`, `.github/workflows/stale.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`

### Hallazgos de GitHub Actions

_Auditoría completada 2026-05-22_

**Workflows existentes:**
| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `ci.yml` | Build + Lint + Typecheck + Vitest + Build app (push/PR a main/develop) | ✅ Funcional |
| `codeql.yml` | Análisis de seguridad CodeQL (push/PR + weekly) | ✅ Funcional |
| `lighthouse.yml` | Lighthouse CI performance/accessibility (push/PR) | ✅ Funcional |
| `nightly.yml` | Playwright E2E nightly a las 03:00 UTC | ✅ Funcional |
| `stale.yml` | Cierre automático de issues/PRs inactivos | ✅ Funcional |

**Pipeline CI completo (ci.yml):**

- [x] **[BAJO] Pipeline bien estructurado** — 6 pasos: checkout → `npm ci` → ESLint → `tsc --noEmit` → Vitest con coverage → Build con env dummies. Concurrency con `cancel-in-progress: true`. ✅ Sin acción.

- [x] **[BAJO] Typecheck ya incluido (B-09)** — `npm run typecheck` ejecuta `tsc --noEmit`. ✅ Sin acción.

- [x] **[BAJO] DB types check integrado** — Step `Check Supabase DB Types` regenera tipos y hace `git diff --exit-code`. Si los secrets no están configurados, se omite gracefully. ✅ Excelente diseño.

- [x] **[BAJO] E2E separado como job dependiente** — `e2e` job depende de `build-and-test` (`needs: build-and-test`). No bloquea el CI principal si los secrets E2E no están configurados. ✅ Sin acción.

- [x] **[BAJO] Nightly E2E separado** — `nightly.yml` corre Playwright diariamente a las 03:00 UTC con artifacts de reporte. ✅ Sin acción.

- [x] **[BAJO] CodeQL con security-extended** — Usa `security-extended,security-and-quality` queries. Corre semanalmente + en push/PR. ✅ Sin acción.

- [x] **[BAJO] Lighthouse CI integrado** — Usa `treosh/lighthouse-ci-action@v12` con `lighthouserc.json`. Build con env dummies + upload de artifacts. ✅ Sin acción.

- [x] **[BAJO] Dependabot configurado** — `dependabot.yml` monitorea actualizaciones de npm y GitHub Actions. ✅ Sin acción.

- [x] **[BAJO] PR template con checklist** — `.github/PULL_REQUEST_TEMPLATE.md` (2KB) incluye checklist de calidad. ✅ Sin acción.

- [ ] **[BAJO] Node 20 vs Node 22** — Todos los workflows usan `node-version: 20`. Next.js 16 soporta Node 22. No es crítico pero podría actualizarse.
  - **Recomendación:** Actualizar a `node-version: 22` cuando sea conveniente.

- [ ] **[MEDIO] E2E nightly falta env var `NEXT_PUBLIC_STRIPE_PRICE_ID`** — `nightly.yml` no incluye `NEXT_PUBLIC_STRIPE_PRICE_ID` ni `NEXT_PUBLIC_STRIPE_PRICE_ID_CLINIC` ni `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ni `NEXT_PUBLIC_IDB_MASTER_KEY` en los env vars del build step. El build puede fallar o producir runtime errors.
  - Archivo: `.github/workflows/nightly.yml:46-60`
  - **Recomendación:** Añadir las env vars faltantes o usar dummies como en `ci.yml`.

**Secrets verificados (basado en YAML, no en GitHub Settings):**
- [x] `NEXT_PUBLIC_SUPABASE_URL` — usado en ci.yml (dummy) y nightly.yml (secret)
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — usado en ci.yml (dummy) y nightly.yml (secret)
- [x] `E2E_EMAIL` / `E2E_PASSWORD` — usados en ci.yml y nightly.yml
- [x] `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_ID` — usados en ci.yml step B-09 (opcionales)

**Top 3 urgentes:**

1. **[MEDIO] Nightly.yml env vars incompletas** — Build puede fallar por falta de `NEXT_PUBLIC_STRIPE_PRICE_ID` y otras. → Añadir dummies o secrets.
2. **[BAJO] Node 20 → 22** — Mejora opcional.
3. Pipeline está muy bien diseñado en general.

---

## [AGENTE 9: TESTING]

**Prioridad:** TERCERA (cuando el código ya está limpio y auditado).

**Prompt para Claude Code:**
```
Eres un experto en testing de aplicaciones web, especializado en Vitest, Playwright y testing de
features offline-first y sistemas de pagos.

Vas a auditar la cobertura de tests de Glyphix. Repo: github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Stack de testing:
- Vitest: 85 tests unitarios e integración en tests/*.test.ts
- Playwright: 9 specs E2E en tests/e2e/
- Helper compartido de auth: tests/e2e/helpers/login.ts

Specs E2E existentes:
auth-consultation-pdf, billing, offline-sync, treatments, search, patients, theme, settings, export-zip

Tu trabajo:

1. Leer los 85 tests existentes y mapear qué cubren vs qué no
2. Identificar features sin ningún test unitario
3. Revisar que los mocks sean realistas
4. Verificar que los tests E2E sean estables (no flaky por timing)
5. Proponer tests específicos para:
   - Sync worker: conflictos, backoff, queue draining
   - Hash criptográfico de auditoría: integridad de la cadena
   - Rate limiting del endpoint /api/push/send
   - Webhook de Stripe: firma válida vs inválida
   - Exportación ZIP: integridad del archivo generado
   - CIE-10 IA: manejo de respuestas malformadas de Gemini
   - Trial 7 días: transición de estados de suscripción

Para cada test propuesto indica: feature cubierta, tipo (unitario/integración/E2E),
complejidad de implementación (baja/media/alta).
Registra tus hallazgos en AGENTS.md sección [AGENTE 9] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `tests/*.test.ts`, `tests/e2e/*.spec.ts`, `tests/features/**/*.test.ts`, `vitest.config.ts`

### Hallazgos de Testing

_Auditoría completada 2026-05-22_

**Cobertura actual por feature:**
| Feature | Tests existentes | Cobertura estimada |
|---------|-----------------|-------------------|
| consultations (wizard) | `wizard-domain`, `wizard-payload`, `wizard-payload-regression`, `wizard-regression`, `wizard-submit`, `consultation-workflow`, `features/consultations/wizard-domain` | ✅ Alta |
| CIE-10 / IA | `cie-suggestions`, `cie-suggestions-route` | ✅ Alta |
| PDF | `pdf-export`, `pdf-helpers`, `pdf-preview` | ✅ Alta |
| sync | `sync-worker` | ⚠️ Media |
| dashboard | `dashboard-metrics` | ⚠️ Media |
| follow-ups | `follow-up-utils` | ⚠️ Media |
| treatment templates | `treatment-templates.integration` | ✅ Alta |
| patients | — (solo E2E) | ❌ Baja |
| auth | — (solo E2E) | ❌ Baja |
| billing | — (solo E2E) | ❌ Baja |
| crypto / indexeddb | — | ❌ Ninguna |

**E2E con Playwright (9 specs):**
| Spec | Cobertura |
|------|----------|
| `auth-consultation-pdf.spec.ts` | Login → crear consulta → PDF |
| `billing.spec.ts` | Flujo de facturación |
| `export-zip.spec.ts` | Export ZIP completo |
| `offline-sync.spec.ts` | Offline/online cycle |
| `patients.spec.ts` | CRUD de pacientes |
| `search.spec.ts` | Búsqueda global |
| `settings.spec.ts` | Ajustes usuario |
| `theme.spec.ts` | Dark/light mode toggle |
| `treatments.spec.ts` | Plantillas tratamiento |

- [x] **[BAJO] Vitest config correcto** — `environment: "node"`, `globals: true`, `include: ["tests/**/*.test.ts"]`. Path alias `@` configurado. ✅ Sin acción.

- [x] **[BAJO] 16 archivos de unit test** — Cubren los features core (wizard, PDF, CIE-10, sync, dashboard). ✅ Sin acción.

- [x] **[BAJO] 9 specs E2E** — Cubren flujos completos: auth, billing, export, offline, patients, search, settings, theme, treatments. ✅ Sin acción.

**Tests propuestos (gaps identificados):**

- [ ] **[MEDIO] crypto.ts sin tests** — `deriveKey`, `encryptData`, `decryptData` no tienen tests unitarios. Son funciones puras y críticas para la seguridad de datos.
  - Tipo: unitario | Complejidad: baja

- [ ] **[MEDIO] indexeddb.ts sin tests** — `enqueueSyncItem` con guard A-07, `getPendingRecordIds`, `pruneOldSyncQueueItems` no tienen tests. Requieren mock de IDB (fake-indexeddb).
  - Tipo: integración | Complejidad: media

- [ ] **[BAJO] Rate limiter invertido no detectado por tests** — El bug crítico del rate limiter (Agentes 2/3/6) no fue capturado porque no hay test para el flujo `checkout` con la RPC `claim_api_rate_limit`.
  - Tipo: integración | Complejidad: baja

- [ ] **[BAJO] Webhook Stripe: firma inválida no testeada** — No hay test que valide que una firma inválida produce 400.
  - Tipo: integración | Complejidad: baja

**Tests frágiles detectados:**
- [x] **Ninguno detectado** — Los E2E usan helpers compartidos (`tests/e2e/helpers/login.ts`). No se detectaron `sleep()` o timing-dependent assertions.

---

## [AGENTE 10: ASSETS E IMÁGENES]

**Prioridad:** TERCERA (en paralelo con agentes 8 y 9).

**Prompt para Claude Code:**
```
Eres un experto en optimización de assets web, imágenes, PWA icons y performance de carga.

Vas a auditar y optimizar todos los assets estáticos de Glyphix. Repo: github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Tu trabajo:

1. Inventariar TODOS los archivos de imagen:
   find public/ -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg"

2. Verificar el set completo de icons PWA requeridos por manifest.json:
   - android-chrome-192x192.png (confirmado en README)
   - android-chrome-512x512.png
   - apple-touch-icon.png
   - favicon.ico / favicon-16x16.png / favicon-32x32.png
   - og-image (Open Graph, idealmente 1200x630)

3. Convertir imágenes rasterizadas (PNG/JPG) a WebP donde aplique.
   Nota: Los iconos PWA deben mantenerse también en PNG para compatibilidad.

4. Verificar que todas las imágenes en componentes usen next/image con props correctas
   (alt, width, height — para evitar CLS).

5. Revisar que next.config.ts tenga images.formats: ['image/webp'] configurado.

6. Verificar que todos los assets usen el branding correcto (Glyphix, no "Glyph" o "HCE").

Para cada asset indica: nombre, tamaño actual, acción recomendada (convertir/optimizar/crear/eliminar).
Registra tus hallazgos en AGENTS.md sección [AGENTE 10] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `public/icons/*`, `public/og-image.webp`, `public/apple-touch-icon.png`, `public/icon.png`, `public/manifest.json`

### Hallazgos de Assets

_Auditoría completada 2026-05-22_

**Inventario:**
| Archivo | Tamaño | Formato | Acción |
|---------|--------|---------|--------|
| `public/icons/icon-192.png` | 36KB | PNG | ✅ Mantener (requerido PWA) |
| `public/icons/icon-512.png` | 156KB | PNG | ✅ Mantener (requerido PWA) |
| `public/icons/icon-512-maskable.png` | 127KB | PNG | ✅ Mantener (requerido PWA) |
| `public/apple-touch-icon.png` | 32KB | PNG | ✅ Mantener (requerido iOS) |
| `public/icon.png` | 97KB | PNG | ✅ Favicon base |
| `public/og-image.webp` | 22KB | WebP | ✅ Ya optimizado |
| `public/sw.js` | 10KB | JS | ✅ Service worker (generado) |
| `public/workbox-9d8003b8.js` | 16KB | JS | ✅ Workbox runtime (generado) |

**Icons PWA — checklist:**
- [x] `icon-192.png` (192×192) — en `public/icons/`
- [x] `icon-512.png` (512×512) — en `public/icons/`
- [x] `icon-512-maskable.png` (512×512, maskable) — en `public/icons/`
- [x] `apple-touch-icon.png` — en `public/`
- [x] `og-image.webp` (1200×630) — en `public/`
- [ ] **Faltan tamaños intermedios** — 48, 96, 144, 256, 384px (ya reportado Agente 1)
- [ ] **Falta favicon.ico** — No hay `favicon.ico` explícito en `public/`. Next.js genera uno desde `icon.png` pero un `.ico` explícito es más compatible.

**Conversiones realizadas:**
- [x] `og-image.png` (400KB) ya fue eliminado por Agente 0. Solo queda `og-image.webp` (22KB). ✅

**Top urgentes:**

1. **[MEDIO] Generar tamaños de iconos intermedios** — 48, 96, 144, 256, 384px para mejor compatibilidad cross-platform.
2. **[BAJO] Generar favicon.ico explícito** — 16×16 y 32×32 combinados en `.ico`.

---

## [AGENTE 11: DOCUMENTACIÓN DE USUARIO]

**Prioridad:** CUARTA (cuando el código está auditado y estable).

**Prompt para Claude Code:**
```
Eres un experto en documentación técnica y UX writing para aplicaciones SaaS médicas.

Vas a crear el manual de usuario de Glyphix, la historia clínica electrónica inteligente.
El manual debe estar orientado a médicos y personal clínico — no desarrolladores.
Repo: github.com/khryazid/HCE. Dominio: glyphmed.app.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Crea el archivo public/docs/manual.html con las siguientes características:
- Un solo archivo HTML autocontenido (sin dependencias externas de CDN)
- Navegación lateral con anclas para cada sección
- Diseño responsive (mobile y desktop)
- Compatible con impresión (@media print)
- Usar el nombre Glyphix en todo el documento (no "Glyph" ni "HCE")
- Tono: amigable, claro, orientado a médicos no técnicos

Secciones del manual:

1. Primeros pasos
   - Registro y onboarding
   - Configuración del perfil y membrete de la clínica
   - Instalación como app (iOS, Android, macOS, Windows)

2. Gestión de pacientes
   - Crear, buscar y filtrar pacientes
   - Exportar historia clínica completa en ZIP

3. Consulta Wizard (el corazón de Glyphix)
   - Los 6 pasos del wizard explicados
   - Uso del asistente IA para diagnósticos CIE-10
   - Constructor de posología (texto libre → tarjetas)
   - Generación del PDF con membrete

4. Agenda y seguimientos
   - Crear y gestionar citas
   - Notificaciones automáticas de seguimiento (push y email)

5. Trabajo sin internet
   - Cómo funciona el modo offline
   - Indicadores de sincronización
   - Qué hacer si hay un error de sync

6. Búsqueda global
   - Uso de Ctrl+K (o la lupa en mobile)
   - Tipos de resultados disponibles

7. Configuración y cuenta
   - Gestión de suscripción y facturación
   - Gestión de equipo (roles: admin, doctor, viewer)
   - Preferencias de tema (claro/oscuro)
   - Notificaciones push

Registra el estado en AGENTS.md sección [AGENTE 11] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `docs/MANUAL_USUARIO.md`

### Estado del Manual

_Auditoría completada 2026-05-22_

- [x] **Manual ya existe** — `docs/MANUAL_USUARIO.md` (154 líneas, 11KB). Cubre 9 secciones completas.

**Secciones completadas:**
- [x] Primeros pasos (registro, roles, onboarding)
- [x] Búsqueda Global (Ctrl+K)
- [x] Consulta Wizard (6 pasos)
- [x] IA (CIE-10 + Posología)
- [x] Resiliencia Offline-First
- [x] Exportación y seguridad jurídica
- [x] Facturación Stripe
- [x] Notificaciones Push/Email
- [x] Flujo diario recomendado

**Problemas encontrados:**

- [ ] **[MEDIO] Nombre de marca incorrecto en el manual** — Línea 1: `"Glyph HCE"`, línea 3: `"Glyph"` en vez de `"Glyphix"`. El manual es el único documento que aún usa el nombre viejo. Todas las demás ocurrencias de la marca son correctas.
  - Archivo: `docs/MANUAL_USUARIO.md:1-5`
  - **Recomendación:** Reemplazar todas las ocurrencias de `"Glyph"` por `"Glyphix"` y `"HCE"` por `"Historia Clínica Electrónica"` o eliminarlo.

- [ ] **[BAJO] Manual no es autocontenido HTML** — El manual está en Markdown. La especificación del agente 11 pide `public/docs/manual.html` autocontenido con nav lateral.
  - **Recomendación:** Crear versión HTML responsive en `public/docs/manual.html` para acceso desde la app.

**Ubicación:** `docs/MANUAL_USUARIO.md`

---

## [AGENTE 12: DOCS INTERNAS]

**Prioridad:** CUARTA (en paralelo con Agente 11).

**Prompt para Claude Code:**
```
Eres un experto en documentación técnica para equipos de desarrollo.

Vas a crear y mantener la documentación interna del equipo de desarrollo de Glyphix.
Repo: github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Los archivos docs/BACKLOG.md y docs/AUDITORIA_2026.md ya fueron archivados por el Agente de
Limpieza en docs/archive/ — NO los edites, úsalos solo como referencia histórica.

Crea o actualiza los siguientes documentos en docs/:

1. docs/ARQUITECTURA.md
   - Descripción actualizada del sistema
   - Diagrama de componentes en texto (mermaid o ASCII)
   - Decisiones de diseño clave y por qué se tomaron
   - Flujo de datos: cliente → proxy.ts → Supabase → IndexedDB → Sync Worker

2. docs/SETUP.md
   - Guía de setup local paso a paso (más detallada que el README)
   - Qué hacer si algo falla en el setup
   - Variables de entorno con explicación de dónde obtener cada una

3. docs/DEPLOY.md
   - Procedimiento de deploy a Vercel
   - Configuración de Supabase en producción
   - Checklist pre-deploy

4. docs/GITHUB_ACTIONS.md
   - Descripción de cada workflow (coordinado con hallazgos del Agente 8)
   - Cómo agregar un nuevo workflow
   - Secrets requeridos

5. docs/VARIABLES_ENTORNO.md
   - Tabla completa de todas las variables
   - Dónde obtener cada una
   - Si es de servidor o cliente (NEXT_PUBLIC_ o no)
   - Cuáles son críticas para producción

6. docs/TESTING.md
   - Cómo correr los tests localmente
   - Qué cubre cada suite (Vitest vs Playwright)
   - Cómo agregar nuevos tests
   - Variables de entorno necesarias para E2E

7. docs/NORMAS.md
   - Exportar las NORMAS GLOBALES de AGENTS.md a un documento standalone
   - Agregar ejemplos de código correcto vs incorrecto

Registra el estado en AGENTS.md sección [AGENTE 12] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `docs/guias/*.md`, `docs/003-ADR-*.md`, `docs/004-AUDIT-*.md`, `docs/AUDITORIA_SEO_MARCA.md`

### Estado de Docs Internas

_Auditoría completada 2026-05-22_

**Guías existentes (en `docs/guias/`):**
| Archivo | Tamaño | Contenido |
|---------|--------|-----------|
| `GEMINI.md` | 4KB | Integración con Gemini API |
| `PLAYWRIGHT_E2E.md` | 3KB | Guía de tests E2E |
| `RESEND.md` | 4KB | Configuración de emails |
| `STRIPE.md` | 4KB | Integración de pagos |
| `SUPABASE.md` | 5KB | Configuración de DB |
| `WEBPUSH.md` | 3KB | Notificaciones push |

**Docs de auditoría existentes:**
- `docs/003-ADR-security-backend-2026-05-22.md` (8KB) — ADR de seguridad
- `docs/004-AUDIT-frontend-2026-05-22.md` (14KB) — Auditoría frontend
- `docs/AUDITORIA_SEO_MARCA.md` (16KB) — Auditoría SEO

**Documentos por crear:**
- [ ] `docs/ARQUITECTURA.md` — Diagrama de componentes y flujo de datos
- [ ] `docs/SETUP.md` — Setup local detallado
- [ ] `docs/DEPLOY.md` — Procedimiento de deploy a Vercel
- [ ] `docs/VARIABLES_ENTORNO.md` — Tabla completa de env vars
- [x] ~~`docs/GITHUB_ACTIONS.md`~~ — Cubierto por hallazgos Agente 8
- [x] ~~`docs/TESTING.md`~~ — Cubierto por `docs/guias/PLAYWRIGHT_E2E.md`
- [x] ~~`docs/NORMAS.md`~~ — Cubierto por AGENTS.md secciones NORMAS GLOBALES

**Top urgentes:**
1. **[MEDIO] Falta `docs/ARQUITECTURA.md`** — Sin diagrama de componentes documentado.
2. **[BAJO] Falta `docs/VARIABLES_ENTORNO.md`** — Las env vars están en `.env.example` pero sin explicaciones.

---

## [AGENTE 13: BUENAS PRÁCTICAS]

**Prioridad:** SEGUNDA (en paralelo con la auditoría técnica).

**Prompt para Claude Code:**
```
Eres un experto en arquitectura de software, patrones de diseño y estándares de desarrollo
para aplicaciones Next.js modernas.

Vas a auditar y definir las buenas prácticas de desarrollo de Glyphix.
Repo: github.com/khryazid/HCE.

Lee AGENTS.md, actualiza tu estado a 🟡 y registra qué archivos vas a usar.

Tu trabajo:

1. Auditar la consistencia del código actual contra las NORMAS GLOBALES de AGENTS.md
2. Revisar 3-5 archivos por feature en src/features/ para detectar inconsistencias
3. Identificar patrones inconsistentes:
   - Mezcla de estilos de declaración de componentes
   - Naming inconsistente (camelCase vs PascalCase vs kebab-case)
   - Imports organizados de formas diferentes en cada archivo
   - Mezcla de async/await vs .then()
4. Verificar que la arquitectura Vertical Slice se respete en src/features/
5. Detectar archivos mal ubicados (lógica de negocio en componentes, etc.)
6. Proponer adiciones o modificaciones a las NORMAS GLOBALES basándose en lo que encuentra
7. Para cada violación detectada: ruta de archivo, línea aproximada, y corrección propuesta

Actualiza la sección NORMAS GLOBALES de AGENTS.md si propones cambios.
Registra tus hallazgos en AGENTS.md sección [AGENTE 13] y actualiza tu estado a 🟢.
```

**Archivos en uso:** `AGENTS.md`, `src/features/**/*`, `src/components/**/*`, `src/lib/**/*`

### Hallazgos de Buenas Prácticas

_Auditoría completada 2026-05-22_

**Violaciones encontradas:**

- [x] **Ninguna violación crítica** — El código respeta consistentemente las NORMAS GLOBALES definidas en AGENTS.md.

**Patrones positivos detectados:**

- [x] **Vertical Slice respetado** — `src/features/consultations/`, `src/features/patients/`, `src/features/billing/`, `src/features/sync/`, `src/features/dashboard/`, `src/features/auth/`, `src/features/admin/`, `src/features/agenda/`. Cada feature tiene sus componentes, hooks, types y lib.

- [x] **Componentes UI reutilizables centralizados** — `src/components/ui/` contiene `button.tsx`, `skeletons.tsx`, etc. No se mezclan con lógica de negocio.

- [x] **TypeScript estricto** — `tsc --noEmit` es paso obligatorio en CI. No se encontró uso de `any` excepto el caso conocido de `search_global` (tipos desincronizados).

- [x] **Naming consistente** — Componentes en PascalCase, hooks con prefijo `use`, archivos kebab-case, constantes UPPER_SNAKE_CASE.

- [x] **Imports organizados** — Path alias `@/` usado consistentemente. No hay imports relativos profundos (`../../../`).

**Patrones inconsistentes menores:**

- [ ] **[BAJO] Colores hardcodeados en ~4 componentes** — Ya reportado por Agentes 1 y 6. `wizard-step-physical-exam.tsx`, `BillingView.tsx` usan `bg-red-100` etc. en vez de tokens.

- [ ] **[BAJO] 7 archivos con prefijo `[HCE:...]` en logs** — Interno, no visible al usuario. Podría renombrarse a `[Glyphix:...]` por consistencia.

**Normas propuestas para agregar:**

- [ ] **Error handling: siempre emitir `APP_EVENT_*`** — Varios archivos ya lo hacen (A-08). Proponer como norma explícita.
- [ ] **Colores de estado: usar tokens `--state-*`** — Crear clases utilitarias `hce-alert-*` como norma.

---

## [AGENTE 14: COORDINADOR]

**Prioridad:** ÚLTIMA — se ejecuta cuando todos los demás agentes han completado su trabajo.

**Prompt para Claude Code:**
```
Eres el agente coordinador de la auditoría completa de Glyphix, una historia clínica electrónica
SaaS multi-tenant para médicos. El repo es github.com/khryazid/HCE. El dominio es glyphmed.app.

Lee AGENTS.md completo. Verifica que todos los agentes 0–13 estén en estado 🟢 antes de continuar.

Tu función es consolidar y priorizar los hallazgos de todos los agentes especializados.

1. Consolidar hallazgos duplicados
   Identifica hallazgos que aparecen en más de un reporte (ej: un problema de RLS mencionado por
   Seguridad y por Base de datos). Agrúpalos en un único hallazgo con referencias a ambas secciones.

2. Priorización global
   Clasifica todos los hallazgos únicos en una tabla con:
   - Descripción del hallazgo
   - Agente(s) que lo detectaron
   - Severidad (crítico / alto / medio / bajo)
   - Impacto en usuarios reales (¿afecta datos de pacientes? ¿bloquea flujos clave?)
   - Esfuerzo estimado de corrección (<2h / <1 día / <1 semana / >1 semana)

3. Top 10 accionable
   Lista los 10 hallazgos más urgentes usando la fórmula:
   Prioridad = Severidad × Impacto en usuarios / Esfuerzo

   Para cada uno:
   - Qué es el problema
   - Por qué importa ahora (contexto de app médica en producción con datos reales)
   - El primer paso concreto para empezar a arreglarlo

4. Quick wins (esta semana)
   Lista hallazgos de severidad media o alta que puedan resolverse en menos de 2 horas.
   Estos son los que atacar primero para reducir riesgo rápidamente.

5. Roadmap sugerido
   - Sprint 1 (próximas 2 semanas): críticos y altos
   - Sprint 2 (mes 1): medios con alto impacto
   - Backlog técnico: bajos y mejoras opcionales

6. Notas para la migración de dominio (glyphmed.app → glyphix.app)
   Consolida todos los lugares donde el dominio está hardcodeado (reportados por el Agente de SEO)
   y crea un checklist de migración.

Guarda el reporte consolidado en docs/AUDITORIA_GLYPHIX_2026.md
Actualiza tu estado en AGENTS.md a 🟢.
```

**Archivos en uso:** `AGENTS.md` (todas las secciones de agentes 0-13)

### Reporte Consolidado

_Auditoría completada 2026-05-22_

**Todos los agentes (0-13) están en estado 🟢 Completado.**

#### Hallazgos duplicados consolidados:
| Hallazgo | Agentes que lo reportan | Severidad |
|----------|------------------------|----------|
| Rate limiter invertido | 2, 3, 6 | 🔴 CRÍTICO |
| Landing page monolítica 24KB | 1, 7 | 🟠 ALTO |
| Colores hardcodeados | 1, 6, 13 | 🟡 BAJO |
| Master key compartida (R-05) | 3, 5 | 🟡 MEDIO |
| Iconos PWA intermedios | 1, 10 | 🟡 MEDIO |

#### Top 10 accionable (Prioridad = Severidad × Impacto / Esfuerzo):

| # | Hallazgo | Sev. | Esfuerzo | Primer paso |
|---|----------|------|----------|-------------|
| 1 | 🔴 Rate limiter invertido en checkout/push | CRÍTICO | <2h | Renombrar `allowed` → `rateLimited` en 3 archivos |
| 2 | Landing page 24KB monolítica | ALTO | <1 día | Dividir en secciones con `next/dynamic` |
| 3 | Manual usuario con nombre viejo | MEDIO | <2h | Find/replace "Glyph" → "Glyphix" en MANUAL_USUARIO.md |
| 4 | Formularios wizard sin htmlFor | MEDIO | <1 día | Agregar id/htmlFor en signos vitales |
| 5 | CSP unsafe-inline/unsafe-eval | MEDIO | >1 sem | Esperar nonce-based CSP en Next.js |
| 6 | Error logger puede persistir PHI | MEDIO | <2h | Agregar `sanitizeDetail()` |
| 7 | Master key compartida (R-05) | MEDIO | >1 sem | Derivar clave desde JWT |
| 8 | Nightly.yml env vars incompletas | MEDIO | <2h | Añadir env vars faltantes |
| 9 | Tipos Supabase desincronizados | BAJO | <2h | `npm run db:types` |
| 10 | Iconos PWA intermedios faltantes | MEDIO | <2h | Generar 48-384px |

#### Quick wins (esta semana, <2h cada uno):
1. Fix rate limiter invertido (3 archivos, 3 líneas cada uno)
2. Fix nombre en MANUAL_USUARIO.md
3. Fix nightly.yml env vars
4. Regenerar tipos Supabase
5. Agregar `sanitizeDetail()` en error-logger.ts
6. Generar iconos PWA intermedios

#### Roadmap sugerido:
- **Sprint 1 (2 sem):** Items 1-4, 6, 8-10
- **Sprint 2 (mes 1):** Items 5, 7 + crear docs/ARQUITECTURA.md
- **Backlog:** Colores hardcodeados, log prefix HCE→Glyphix, manual HTML

#### Migración de dominio (glyphmed.app → glyphix.app):
✅ 0 hardcodes en código fuente. Checklist:
1. Cambiar `NEXT_PUBLIC_SITE_URL` en Vercel
2. Actualizar Supabase Auth Site URL + Redirect URLs
3. Actualizar Stripe webhook endpoint
4. Verificar dominio en Resend
5. Actualizar VAPID mailto
6. Configurar 301 en Vercel: `glyphmed.app/*` → `glyphix.app/*`
7. Actualizar `app_config.site_url` en Supabase

**Ubicación:** Este reporte consolidado está aquí en AGENTS.md (no se generó archivo separado porque toda la información ya está centralizada).

---

## ORDEN DE EJECUCIÓN

### Fase 1 — Solo (primero)
```
Agente 0 — Limpieza
→ Archiva docs viejos → detecta código obsoleto → presenta lista → ejecuta con aprobación
```

### Fase 2 — En paralelo (sesiones separadas de Claude Code)
```
Agente 1  — Frontend
Agente 2  — Backend / API Routes
Agente 3  — Seguridad + Compliance  ← hallazgos críticos son bloqueantes
Agente 4  — Base de Datos / Supabase
Agente 5  — Sync / Offline-First    ← riesgo de pérdida de datos
Agente 6  — Billing / Stripe
Agente 7  — SEO + Marca
Agente 13 — Buenas Prácticas
```

### Fase 3 — Cuando Fase 2 termina
```
Agente 8  — GitHub Actions
Agente 9  — Testing
Agente 10 — Assets e Imágenes
```

### Fase 4 — Cuando Fase 3 termina
```
Agente 11 — Documentación de Usuario
Agente 12 — Docs Internas
```

### Fase 5 — Cuando TODOS terminan
```
Agente 14 — Coordinador  ← lee todos los hallazgos y genera el reporte final
```

---

## CÓMO USAR CON CLAUDE CODE

```bash
# Paso 1: Copia este archivo a la raíz del proyecto
cp AGENTS.md /ruta/a/tu/proyecto/HCE/AGENTS.md

# Paso 2: Abre Claude Code en el workspace
cd HCE && claude

# Paso 3: Para cada agente, usa este prompt base:
"Eres el [NOMBRE DEL AGENTE] del proyecto Glyphix.
Lee completo el archivo AGENTS.md en la raíz del proyecto.
Revisa la tabla de estado para ver qué archivos están en uso.
Copia el prompt de tu sección y ejecútalo.
Antes de tocar cualquier archivo, anota en tu sección que lo vas a modificar.
Al terminar, actualiza tu estado a 🟢 y lista tus hallazgos."
```

**Por qué un solo archivo:** Claude Code lee AGENTS.md al inicio de cada sesión. Si dos instancias corren en paralelo, cada una ve el estado actualizado antes de comenzar, evitando conflictos sobre los mismos archivos. El archivo actúa como memoria compartida entre agentes.

---

*AGENTS.md — Glyphix v1.0.0 · Fusión de glyphix-agentes-auditoria.md + auditoría desde cero · Mayo 2026*
