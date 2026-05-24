AGENTS.md — Contexto del Proyecto para Agentes

> Este archivo es leído automáticamente por los agentes en cada sesión con el repositorio.
> Contiene el contexto esencial que todo agente necesita antes de empezar a trabajar.

---

## Qué es este proyecto

**Glyphix** es una historia clínica electrónica (HCE) SaaS multi-tenant para médicos.
- Nombre comercial: **Glyphix**
- Nombre en el repo y código: puede aparecer como `Glyph`, `HCE`, o `glyphix`
- Dominio en producción: `glyphmed.app`
- Dominio objetivo futuro: `glyphix.app` (aún no adquirido)
- Repo: `github.com/khryazid/HCE`

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, **Webpack** — Turbopack descartado) |
| UI | React 19, Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL + RLS + pg_cron) |
| Auth | Supabase Auth + `proxy.ts` (reemplaza `middleware.ts`) |
| Estado/Cache | TanStack Query v5 |
| Offline | IndexedDB (`idb`) + Sync Worker con backoff exponencial |
| IA | Google Gemini 2.0 Flash (sugerencias CIE-10) |
| Pagos | Stripe API v2026-04-22, Webhooks firmados |
| Notificaciones | Web Push (VAPID) + Resend (email) |
| PDF/Export | jsPDF 4.x + JSZip |
| Testing | Vitest (85 tests) + Playwright (9 specs E2E) |

---

## Archivos clave

```
AUDITORIA_GLYPHIX.md              ← FUENTE ÚNICA DE VERDAD de la auditoría
DEVELOPMENT_RULES.md              ← Reglas de desarrollo (generado por Agente 10)
src/proxy.ts                      ← SSR auth (NO es middleware.ts)
src/lib/env.ts                    ← Validación de variables de entorno
src/lib/db/                       ← Schema de IndexedDB
src/lib/sync/                     ← Sync worker con backoff exponencial
src/lib/observability/            ← Logger de errores
src/features/                     ← Arquitectura Vertical Slice
src/types/supabase.types.ts       ← Tipos TypeScript generados (npm run db:types)
supabase/migrations/000_production_full_schema.sql  ← Única fuente de verdad del schema
tests/e2e/                        ← Specs de Playwright
tests/*.test.ts                   ← Tests de Vitest
.github/workflows/                ← Pipelines de CI (con errores actualmente)
docs/                             ← Documentación interna del desarrollador
public/                           ← Assets estáticos (favicons, icons PWA)
```

---

## Decisiones de arquitectura importantes

1. **Webpack sobre Turbopack** — `next-pwa` es incompatible con Turbopack. Siempre usar `npm run dev` (no `--turbo`).
2. **`proxy.ts` en lugar de `middleware.ts`** — Es el mecanismo de protección de rutas SSR en Next.js 16.
3. **IndexedDB como fuente de verdad local** — La app funciona sin internet. El sync worker sube a Supabase en background.
4. **Schema único** — `supabase/migrations/000_production_full_schema.sql` es la única fuente de verdad. No hay migraciones incrementales.
5. **Tipos generados** — `src/types/supabase.types.ts` se genera con `npm run db:types`. Nunca editar manualmente.
6. **Rate limiting en Postgres** — El rate limiting está implementado como RPC en Supabase, no en middleware de Next.js.

---

## Sistema de auditoría — Protocolo de agentes

### El archivo de verdad

**`AUDITORIA_GLYPHIX.md`** (en la raíz del repo) es el único archivo donde los agentes escriben sus hallazgos. Tiene una sección exclusiva por cada agente.

### Reglas obligatorias para TODOS los agentes

```
REGLA 1: Lee AUDITORIA_GLYPHIX.md COMPLETO antes de escribir nada
REGLA 2: Escribe SOLO en tu sección ## AGENTE [N] — [NOMBRE]
REGLA 3: Si encuentras algo de otro agente → anótalo como
         🔗 Referir → Agente X: [descripción breve]
         NO lo desarrolles tú
REGLA 4: Marca tu sección como ✅ Completo cuando termines
REGLA 5: Termina SIEMPRE con ### 📋 Tareas para el desarrollador
REGLA 6: NUNCA ejecutes código ni modifiques archivos del proyecto
         excepto AUDITORIA_GLYPHIX.md
```

### Si te piden hacer algo fuera de tu scope

Responde exactamente así:
> "Ese hallazgo pertenece al Agente [N] — [nombre]. Lo anoto como 🔗 Referir en mi sección y continúo con mi scope."

### Orden de ejecución

```
FASE 0  →  Agente 0  — Limpieza Setup          (primero, solo)
FASE 1  →  Agente 10 — Dev Rules               (segundo, solo)
FASE 2  →  Agentes 1-9, 11                     (paralelo)
FASE 3  →  Agentes 12, 13                      (paralelo)
FASE 4  →  Agente 14 — Coordinador             (último, solo)
```

### Agentes disponibles y sus scopes

| # | Nombre | Scope exclusivo |
|---|--------|----------------|
| 0 | Limpieza & Setup | Archivos obsoletos, imports muertos, dependencias sin uso |
| 1 | Frontend | React, SSR, Tailwind, PWA, UX, accesibilidad |
| 2 | Backend / API Routes | Endpoints, Gemini, Resend, VAPID, logging |
| 3 | Seguridad + Compliance | RLS, OWASP, headers, secretos, datos médicos |
| 4 | Base de Datos | Schema, índices, pg_cron, RPCs, migraciones |
| 5 | Sync / Offline-First | IndexedDB, sync worker, Realtime, conflictos |
| 6 | Billing / Stripe | Webhooks, suscripciones, multi-seat, idempotencia |
| 7 | SEO + Marca | Metadatos, Core Web Vitals, branding, sitemap |
| 8 | GitHub Actions | Workflows, CI pipeline, secrets de CI, E2E en CI |
| 9 | Testing / QA | Vitest, Playwright, cobertura, gaps de tests |
| 10 | Buenas Prácticas | Convenciones, TypeScript, manejo de errores, DEVELOPMENT_RULES.md |
| 11 | Assets & Imágenes | Favicons, WebP, PWA icons, next/image, membrete PDF |
| 12 | Docs de Usuario | Manual HTML para médicos, estructura, contenido, hosting |
| 13 | Docs Internas | Carpeta docs/, guías del desarrollador, onboarding |
| 14 | Coordinador | Consolidar todos los reportes, priorizar, plan final |

---

## Scripts disponibles

```bash
npm run dev          # Desarrollo (Webpack — no usar --turbo)
npm run build        # Build de producción
npm run lint         # ESLint sobre src/
npm run typecheck    # TypeScript sin emitir (npx tsc --noEmit)
npm run test         # Vitest (85 tests)
npm run test:e2e     # Playwright E2E (requiere E2E_EMAIL + E2E_PASSWORD)
npm run db:types     # Regenera supabase.types.ts
```

---

## Variables de entorno necesarias

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Solo servidor

# Stripe
STRIPE_SECRET_KEY=                  # Solo servidor
STRIPE_WEBHOOK_SECRET=              # Solo servidor
NEXT_PUBLIC_STRIPE_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# VAPID (Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=                  # Solo servidor
VAPID_MAILTO=
PUSH_SEND_SECRET=                   # Solo servidor

# Email
RESEND_API_KEY=                     # Solo servidor
RESEND_EMAIL_SECRET=                # Solo servidor
RESEND_FROM_EMAIL=

# Admin
ADMIN_EMAIL=

# Solo local
SUPABASE_ACCESS_TOKEN=
E2E_EMAIL=                          # Para tests de Playwright
E2E_PASSWORD=                       # Para tests de Playwright
```

---

## Contexto adicional para agentes

- Los documentos en `docs/BACKLOG.md` y `docs/AUDITORIA_2026.md` son **históricos y desactualizados**. No los uses como referencia del estado actual del proyecto. La fuente de verdad es el código y `AUDITORIA_GLYPHIX.md`.
- La app está en **producción real** con datos de pacientes reales. Cualquier hallazgo de seguridad debe tratarse con prioridad máxima.
- El pipeline de GitHub Actions tiene **errores activos**. El Agente 8 es responsable de diagnosticarlos.
- La identidad de marca tiene un delta: el nombre es **Glyphix** pero el código puede decir **Glyph** o **HCE**. El Agente 7 y el Agente 11 documentarán todos los lugares a corregir.
