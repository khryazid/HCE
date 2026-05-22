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
| 1 — Frontend | 🔴 Pendiente | — | — |
| 2 — Backend / API | 🔴 Pendiente | — | — |
| 3 — Seguridad | 🔴 Pendiente | — | — |
| 4 — Base de Datos | 🔴 Pendiente | — | — |
| 5 — Sync / Offline | 🔴 Pendiente | — | — |
| 6 — Billing / Stripe | 🔴 Pendiente | — | — |
| 7 — SEO + Marca | 🔴 Pendiente | — | — |
| 8 — GitHub Actions | 🔴 Pendiente | — | — |
| 9 — Testing | 🔴 Pendiente | — | — |
| 10 — Assets | 🔴 Pendiente | — | — |
| 11 — Doc. Usuario | 🔴 Pendiente | — | — |
| 12 — Docs Internas | 🔴 Pendiente | — | — |
| 13 — Buenas Prácticas | 🔴 Pendiente | — | — |
| 14 — Coordinador | 🔴 Pendiente (último) | — | — |

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Frontend

**Hydration / SSR:**
- [ ] ...

**Wizard de Consultas:**
- [ ] ...

**Rendimiento:**
- [ ] ...

**Accesibilidad:**
- [ ] ...

**UX / Flujos:**
- [ ] ...

**PWA:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Backend / API

**API Routes:**
- [ ] ...

**Gemini / CIE-10:**
- [ ] ...

**Stripe Webhooks:**
- [ ] ...

**Push / Email:**
- [ ] ...

**Variables de entorno:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Seguridad

> ⚠️ Hallazgos críticos son bloqueantes — resolver antes de continuar con otras fases.

**RLS:**
- [ ] ...

**Autenticación:**
- [ ] ...

**Datos de pacientes 🔴:**
- [ ] ...

**Auditoría clínica:**
- [ ] ...

**OWASP:**
- [ ] ...

**Compliance médico:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Base de Datos

**Schema y diseño:**
- [ ] ...

**Índices y performance:**
- [ ] ...

**N+1 / Realtime:**
- [ ] ...

**pg_cron:**
- [ ] ...

**RPCs:**
- [ ] ...

**Migraciones:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Sync / Offline

**Sync Worker:**
- [ ] ...

**IndexedDB:**
- [ ] ...

**Realtime WebSocket:**
- [ ] ...

**Edge cases críticos ⚠️:**
- [ ] ...

**UX del sync:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Billing / Stripe

**Seguridad de webhooks:**
- [ ] ...

**Idempotencia:**
- [ ] ...

**Estados de suscripción:**
- [ ] ...

**Multi-seat:**
- [ ] ...

**Trial 7 días:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de SEO + Marca

**Identidad de marca:**
- [ ] ...

**SEO técnico:**
- [ ] ...

**Core Web Vitals:**
- [ ] ...

**Migración de dominio:**
- [ ] ...

**Top 5 urgentes:**
1. ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de GitHub Actions

**Workflows existentes:**
| Archivo | Propósito | Estado |
|---------|-----------|--------|
| ... | ... | ... |

**Errores encontrados:**
- [ ] ...

**Fixes aplicados:**
- [ ] ...

**Secrets verificados:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `E2E_EMAIL` / `E2E_PASSWORD`

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Testing

**Cobertura actual por feature:**
| Feature | Tests existentes | Cobertura estimada |
|---------|-----------------|-------------------|
| auth | ... | ... |
| consultations | ... | ... |
| patients | ... | ... |
| billing | ... | ... |
| sync | ... | ... |
| dashboard | ... | ... |

**Tests propuestos:**
- [ ] ...

**Tests frágiles detectados:**
- [ ] ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Assets

**Inventario:**
| Archivo | Tamaño | Formato | Acción |
|---------|--------|---------|--------|
| `public/android-chrome-192x192.png` | ... | PNG | Mantener PNG + generar WebP |
| ... | ... | ... | ... |

**Icons PWA — checklist:**
- [ ] `android-chrome-192x192.png`
- [ ] `android-chrome-512x512.png`
- [ ] `apple-touch-icon.png`
- [ ] `favicon.ico`
- [ ] `favicon-16x16.png` / `favicon-32x32.png`
- [ ] `og-image.webp` (1200x630)

**Conversiones realizadas:**
- [ ] ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Estado del Manual

**Secciones completadas:**
- [ ] Primeros pasos
- [ ] Gestión de pacientes
- [ ] Consulta Wizard
- [ ] Agenda y seguimientos
- [ ] Trabajo sin internet
- [ ] Búsqueda global
- [ ] Configuración y cuenta

**Ubicación:** `public/docs/manual.html`

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Estado de Docs Internas

**Documentos por crear:**
- [ ] `docs/ARQUITECTURA.md`
- [ ] `docs/SETUP.md`
- [ ] `docs/DEPLOY.md`
- [ ] `docs/GITHUB_ACTIONS.md`
- [ ] `docs/VARIABLES_ENTORNO.md`
- [ ] `docs/TESTING.md`
- [ ] `docs/NORMAS.md`

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Hallazgos de Buenas Prácticas

**Violaciones encontradas:**
- [ ] ...

**Normas propuestas para agregar:**
- [ ] ...

**Patrones inconsistentes:**
- [ ] ...

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

**Archivos en uso:** _(registrar antes de comenzar)_

### Reporte Consolidado

**Ubicación:** `docs/AUDITORIA_GLYPHIX_2026.md` _(generado por este agente)_

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
