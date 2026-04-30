# HCE Multiespecialidad

Plataforma SaaS de historias clínicas multiespecialidad con enfoque offline-first, sincronización por cola y aislamiento multi-tenant.

## Tabla de contenido

- [Descripción](#descripción)
- [Estado actual](#estado-actual)
- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Instalación y arranque](#instalación-y-arranque)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Base de datos y SQL](#base-de-datos-y-sql)
- [Admin Panel](#admin-panel-super-admin)
- [Testing y calidad](#testing-y-calidad)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roadmap](#roadmap)
- [Changelog](#changelog)

---

## Descripción

HCE Multiespecialidad permite gestionar pacientes, consultas y seguimientos clínicos con soporte para trabajo offline, sincronización posterior, sugerencias CIE-10 asistidas por IA y generación de PDF clínico multipágina.

---

## Estado actual

| Campo | Valor |
| --- | --- |
| Versión | 1.0.0 |
| Estado | **Producción** |
| Testers activos | 3 |

Verificación técnica pre-producción:

- `tsc --noEmit` → 0 errores
- ESLint → 0 warnings, 0 errores
- Suite de tests → verde (90 tests, 15 archivos)
- Dev server → arranca correctamente
- Middleware de autenticación → maneja refresh token inválido con redirección limpia
- Admin panel → protegido por verificación de email en servidor

---

## Características

### Flujo de autenticación
- Registro y login con Supabase Auth
- Onboarding guiado con perfil profesional (nombre, especialidades, clínica)
- Guard de suscripción y onboarding en todas las rutas del dashboard
- Manejo graceful de tokens expirados o revocados (redirige a login, limpia cookies)

### Wizard de consulta
- Modo **Consulta Completa** y modo **Seguimiento Clínico**
- Selector de especialidad dinámico (usa las especialidades reales configuradas por el médico)
- Auto-scroll al primer campo inválido al intentar guardar
- Antecedentes con listas de bullets automáticas al presionar Enter
- Campo T.A. con autoformato inteligente
- Campos de fecha con máscara DD/MM/AAAA
- Sugerencias CIE-10 asistidas por Gemini AI con retry automático

### Evolución y seguimiento
- Sección de evolución visible **solo en modo seguimiento**
- Contexto de la consulta anterior (diagnóstico + tratamiento) visible al registrar evolución
- Quick chips de estado clínico: "Mejoría clínica evidente", "Alta médica", etc.
- Selector de estado del paciente al cerrar consulta (Alta / En seguimiento / Activo / Inactivo)
- Al guardar, actualiza automáticamente el estado del perfil del paciente sin pasos adicionales
- Sección de Próximo Control siempre visible al final (independiente del modo)

### Documentos clínicos
- PDF multipágina: historia clínica completa + receta farmacia + hoja del paciente
- Membrete configurable por el médico

### Datos y sincronización
- Persistencia local en IndexedDB con cifrado PHI (AES-KW)
- Cola de sincronización offline-first con backoff exponencial por ítem
- Estado terminal `abandoned` para ítems que no se pueden recuperar
- Dependency guard: si un paciente falla, sus consultas dependientes esperan al siguiente flush

### Admin Panel
- Panel privado en `/admin` accesible solo para el superadmin
- Gestión de suscripciones sin tocar código ni Supabase
- Ver, activar, dar lifetime y eliminar cuentas (ver sección completa abajo)

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript + Tailwind CSS |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Base de datos | PostgreSQL en Supabase con RLS |
| Offline | IndexedDB via `idb` + cifrado AES-KW |
| IA | Google Gemini (`gemini-2.0-flash` por defecto) |
| PDF | Generación client-side |
| Notificaciones | Sonner |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Linting | ESLint + TypeScript strict |

---

## Arquitectura

```
┌─────────────────────────────────────────┐
│  Next.js App Router                      │
│  ┌───────────┐  ┌───────────────────┐   │
│  │  /admin   │  │  /(dashboard)/*   │   │
│  │ (Server)  │  │  (Client + Guard) │   │
│  └───────────┘  └───────────────────┘   │
│        │                 │              │
│  Service Role       Anon Key            │
└─────────────────────────────────────────┘
          │                 │
    Supabase Admin    Supabase Auth + DB
                             │
                       IndexedDB (offline)
                       Sync Queue → Flush
```

**Principios clave:**
- **Offline-first:** la app guarda localmente y sincroniza por cola cuando hay conectividad
- **Sync robusto:** diferencia entre fallo temporal y registro abandonado (FK guard)
- **IA sin fallback de catálogo:** si Gemini no responde, retorna array vacío con feedback al usuario
- **Admin separado del producto:** el panel admin usa la `service_role` key solo en Server Actions, nunca expuesta al cliente

---

## Instalación y arranque

### Requisitos

- Node.js 20+
- npm 10+
- Proyecto en Supabase (gratuito funciona)

### Pasos

```bash
# 1. Clonar e instalar
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (ver sección siguiente)

# 3. Ejecutar el schema de base de datos
# Abrir src/lib/supabase/000_production_full_schema.sql en el SQL Editor de Supabase y ejecutar

# 4. Iniciar en desarrollo
npm run dev
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sí | Clave anónima de Supabase (pública, safe para el cliente) |
| `GEMINI_API_KEY` | ✅ Sí | Clave de Google AI Studio para sugerencias CIE-10. Sin ella retorna sugerencias vacías |
| `GEMINI_MODEL` | ⬜ No | Modelo de Gemini (default: `gemini-2.0-flash`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Admin | Clave de rol de servicio. **Solo para el Admin Panel.** Nunca exponerla al cliente. Obtenerla en Supabase → Project Settings → API → `service_role` |
| `NEXT_ALLOWED_DEV_ORIGINS` | ⬜ No | Orígenes permitidos para acceso de red local en desarrollo |
| `E2E_EMAIL` / `E2E_PASSWORD` | ⬜ Tests | Credenciales para los tests E2E de Playwright |

> **Nota de seguridad:** `SUPABASE_SERVICE_ROLE_KEY` NO tiene prefijo `NEXT_PUBLIC_` por diseño. Solo es accesible en el servidor (Server Actions). Jamás colocarla con prefijo público.

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción (requiere build previo)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (unit + integration)
npm run test:e2e     # Playwright headless
npm run test:e2e:headed  # Playwright con navegador visible
```

---

## Base de datos y SQL

Un solo archivo, idempotente, para despliegue completo o actualización:

```
src/lib/supabase/000_production_full_schema.sql
```

**Cómo ejecutarlo:** Supabase → SQL Editor → New query → pegar → Run.

Es seguro re-ejecutarlo sobre una base ya poblada: usa `IF NOT EXISTS` y `DROP ... IF EXISTS` en todo.

**Incluye:**

| Sección | Contenido |
| --- | --- |
| Tablas | `profiles`, `patients`, `clinical_records`, `specialty_data`, `audit_logs`, `follow_up_tasks`, `api_rate_limits` |
| Columnas nuevas | `subscription_expires_at` en profiles, valor `lifetime` en constraint |
| RLS | Políticas de Row Level Security por tenant en todas las tablas |
| `audit_logs` | Append-only (UPDATE y DELETE bloqueados por RLS) |
| Triggers | `updated_at` automático en todas las tablas mutables |
| Funciones RPC | `log_audit_event`, `claim_api_rate_limit` |
| Vista materializada | `mv_dashboard_kpis_daily` (ver nota de cron abajo) |

**Vista materializada (cron job opcional):**
Para refrescar los KPIs del dashboard automáticamente, activar `pg_cron` en Supabase (Database → Extensions) y ejecutar:
```sql
select cron.schedule(
  'refresh_mv_kpis_daily',
  '0 0 * * *',
  $$refresh materialized view concurrently public.mv_dashboard_kpis_daily$$
);
```

---

## Admin Panel (Super Admin)

Panel privado de administración de usuarios y suscripciones. Accesible **únicamente** para `khristian.yazid@gmail.com`.

### Cómo acceder

1. **Obtener la Service Role Key** (solo primera vez):
   - Supabase → Project Settings → API → copiar la key `service_role`
   - Pegarla en `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...`

2. **Ejecutar el schema SQL** (`000_production_full_schema.sql`) si no se ha hecho.

3. **Iniciar sesión** con `khristian.yazid@gmail.com` en la app.

4. **Navegar a `/admin`**:
   - Desarrollo: `http://localhost:3000/admin`
   - Producción: `https://tu-dominio.com/admin`

> Cualquier otro usuario que intente acceder a `/admin` es redirigido silenciosamente a `/` sin mensaje de error.

### Funcionalidades del panel

| Función | Detalle |
| --- | --- |
| Estadísticas globales | Total, activos, lifetime, inactivos, sin plan |
| Buscador | Filtra por nombre, email o especialidad en tiempo real |
| Ver estado | Plan actual y fecha de expiración de cada usuario |
| Activar plan | Normal: 7 / 15 / 30 / 90 / 180 / 365 días o 10 años |
| Dar Lifetime | Acceso permanente sin fecha de expiración |
| Desactivar | Cambia estado a Inactivo |
| Eliminar cuenta | Doble confirmación: escribir `ELIMINAR`. Borra perfil + usuario de auth |

### Archivos del admin panel

| Archivo | Propósito |
| --- | --- |
| `src/features/admin/actions.ts` | Server Actions: guard de email, queries y mutaciones con Service Role Key |
| `src/app/(dashboard)/admin/page.tsx` | Página servidor con guard de acceso y Suspense |
| `src/app/(dashboard)/admin/admin-client.tsx` | UI: tabla, buscador, selects de plan, modales de confirmación |

---

## Testing y calidad

Checklist antes de merge o deploy:

```bash
npm run lint        # 0 errores, 0 warnings
npm run typecheck   # 0 errores TS
npm run test        # Suite en verde
```

---

## Estructura del proyecto

```text
/
├── src/
│   ├── app/                        # App Router (Next.js)
│   │   ├── api/                    # API routes (cie-suggestions, stripe webhook)
│   │   └── (dashboard)/
│   │       ├── admin/              # Super Admin Panel (acceso restringido)
│   │       ├── dashboard/          # KPIs y actividad
│   │       ├── pacientes/          # Historial clínico
│   │       ├── consultas/          # Wizard de consulta
│   │       ├── tratamientos/       # Plantillas de tratamiento
│   │       ├── ajustes/            # Perfil profesional y onboarding
│   │       └── billing/            # Gestión de suscripción
│   ├── components/                 # Componentes UI compartidos
│   ├── features/                   # Vertical slices por dominio
│   │   ├── admin/                  # Server Actions del panel administrativo
│   │   ├── auth/                   # Autenticación y sesión
│   │   ├── billing/                # Stripe y suscripciones
│   │   ├── consultations/          # Wizard, CIE, PDF, sync
│   │   │   ├── components/         # Pasos del wizard y vistas
│   │   │   ├── context/            # ClinicalProvider
│   │   │   ├── lib/                # Hooks, domain logic, PDF, payload
│   │   │   └── types/              # Tipos clínicos (SpecialtyKind, etc.)
│   │   ├── dashboard/              # KPIs, métricas, guard de onboarding
│   │   ├── patients/               # Lista, historial, status badge
│   │   └── sync/                   # UI del estado de sincronización
│   ├── lib/                        # Utilitarios globales
│   │   ├── constants/              # Constantes de dominio
│   │   ├── db/                     # IndexedDB + crypto AES-KW
│   │   ├── observability/          # App events y usage tracker
│   │   ├── supabase/               # Cliente, server, middleware, schema SQL
│   │   ├── sync/                   # Cola de sincronización offline (worker)
│   │   └── ui/                     # Helpers de formato y UI
│   └── types/                      # Tipos Supabase generados (supabase.types.ts)
├── tests/                          # Unit e integration tests (Vitest)
├── tests/e2e/                      # E2E tests (Playwright)
├── public/                         # Assets estáticos y PWA manifest
└── supabase/                       # (carpeta reservada — schema en src/lib/supabase/)
```

---

## Roadmap

- [ ] QA con testers beta (en curso — 3 usuarios activos)
- [ ] Activar flujo completo de Stripe (SDK integrado, falta configurar productos/precios en dashboard de Stripe)
- [ ] Cron job en Supabase para refrescar `mv_dashboard_kpis_daily`
- [ ] Despliegue final en Vercel con variables de entorno de producción
- [ ] Notificaciones de próximas citas (email o push)

---

## Changelog

### 2026-04-30 — v1.0.0 (Producción)

**Auth y sesiones**
- Manejo graceful de `refresh_token_not_found`: middleware limpia cookies `sb-*` y redirige a `/login`
- `TenantProvider` migrado de `getSession()` a `getUser()` (más seguro, no dispara refresh en background)
- Listener `onAuthStateChange` para detectar `SIGNED_OUT` y redirigir automáticamente
- Sync worker migrado a `getUser()` con early return limpio si no hay sesión

**Admin Panel**
- Nueva ruta `/admin` con panel de gestión de usuarios y suscripciones
- Server Actions protegidas con verificación de email en servidor (`khristian.yazid@gmail.com`)
- Planes: Normal (7d/15d/30d/90d/180d/365d/10años), Lifetime, Inactivo
- `subscription_expires_at` en tabla `profiles`
- Valor `lifetime` agregado al CHECK constraint de `subscription_status`
- Eliminar cuenta con doble confirmación (borra perfil + auth user)

**UX del Wizard**
- Selector de especialidad dinámico: usa especialidades reales del médico, no opciones hardcodeadas
- Selector de estado clínico del paciente al cerrar consulta (actualiza perfil automáticamente al guardar)
- Sección de Evolución visible solo en modo seguimiento
- Contexto de consulta anterior (diagnóstico + tratamiento) en la sección de evolución
- Quick chips de estado clínico rápido
- Próximo Control y Estado del Paciente en panel separado, siempre visible al final
- Títulos de sección con `dark:text-teal-400` — legibles en modo oscuro
- `SpecialtyKind` extendido para soportar especialidades personalizadas del tenant

**Guard de onboarding**
- Eliminada dependencia de `session` (objeto que ya no se guarda en estado)
- `"lifetime"` agregado a `validSubscriptionStatuses`
- Ruta `/admin` bypasea todos los checks clínicos de onboarding y suscripción
- Check de onboarding ahora llama `getUser()` en lugar de leer de `session`

**SQL unificado**
- `000_production_full_schema.sql` incluye toda la historia: tablas, RLS, índices, funciones, triggers, vista materializada y todas las migraciones posteriores en un solo archivo idempotente
- Archivo de migración parcial `add_subscription_expires_at.sql` eliminado

**TypeScript / Lint**
- `createSupabaseServerClient` → alias correcto del export real `createClient`
- `react-hot-toast` (no instalado) → reemplazado por `sonner` (la lib de toast del proyecto)
- `SpecialtyKind` ampliado con `| (string & {})` para soportar especialidades personalizadas sin romper autocompletado

---

### 2026-04-30 — RC2 (Limpieza pre-producción)

- PDF multipágina finalizado con membrete y firma responsiva
- Eliminado catálogo local CIE-10 — sugerencias 100% por Gemini
- Examen físico estructurado por sistemas en el Wizard
- UX: bullets automáticos en antecedentes, autoformato T.A., máscara de fecha
- Deuda técnica cero: 0 `any` types, 0 unused vars, 0 warnings ESLint
- Alias `@` corregido en configuración Vitest
- Especialidad real del médico enviada a Gemini como contexto

---

### 2026-04-29 — Estabilización

- Dependency guard en sync worker para violaciones de FK
- Retry automático en errores 503 de Gemini (1 intento, delay 1.2s)
- Máscara DD/MM/AAAA en todos los campos de fecha del wizard

---

### 2026-04-28 — Pre-Producción

- Purga masiva de deuda técnica y componentes huérfanos
- Cifrado AES-KW de alta entropía para claves IDB locales
- Cabeceras CSP implementadas
- Suite de tests en verde (91 tests)
