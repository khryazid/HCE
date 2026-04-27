# HCE Multiespecialidad

Plataforma SaaS de historias clinicas multiespecialidad con enfoque offline-first, sincronizacion por cola y aislamiento multi-tenant.

## Tabla de contenido

- Descripcion
- Estado actual
- Caracteristicas
- Stack tecnologico
- Arquitectura
- Instalacion y arranque
- Variables de entorno
- Scripts disponibles
- Base de datos y SQL
- Testing y calidad
- Estructura del proyecto
- Roadmap
- Control operativo en Notion
- Changelog

## Descripcion

HCE Multiespecialidad permite gestionar pacientes, consultas y seguimientos clinicos con soporte para trabajo offline, sincronizacion posterior, sugerencias CIE asistidas y generacion de PDF clinico.

## Estado actual

| Campo | Valor |
| --- | --- |
| Version | 0.1.0 |
| Estado | Activo en refactor y endurecimiento operativo |
| Repo | Pendiente de URL publica |
| URL de produccion | Pendiente |

Verificacion tecnica reciente:

- Typecheck global en verde.
- Suite de tests en verde.
- Dev server iniciando correctamente en entorno local.
- SQL consolidado actualizado con rate limiting CIE en RPC compartido.

## Caracteristicas

- Autenticacion y registro con Supabase.
- Flujo de acceso separado en login y registro.
- Onboarding y perfil profesional centralizados en ajustes.
- Dashboard con KPIs clinicos, actividad y alertas.
- Wizard de consulta por pasos con modo consulta y seguimiento.
- Sugerencias CIE asistidas con fallback al catalogo local.
- Pacientes como historial clinico navegable con timeline.
- Modulo de tratamientos con CRUD por medico.
- Generacion y previsualizacion de PDF clinico con membrete.
- Persistencia local en IndexedDB con cifrado PHI.
- Cola de sincronizacion con backoff por item y estado terminal abandoned.
- Soporte PWA y pantalla offline.

## Stack tecnologico

### Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS

### Backend y dominio

- API routes en Next.js
- Supabase Auth
- Multi-tenant por doctor y clinica

### Base de datos

- PostgreSQL en Supabase
- RLS
- RPC para rate limit de CIE

### Calidad

- Vitest para unit e integration tests
- Playwright para E2E
- ESLint + TypeScript strict checks

## Arquitectura

- Offline-first: la app guarda localmente y sincroniza por cola cuando hay conectividad.
- Sync robusto: diferencia entre fallo temporal y registro abandonado.
- Dominio desacoplado: el wizard de consultas fue dividido en hooks y helpers testeables.
- Fallback controlado: si Gemini no responde, se usa catalogo local de CIE.

## Instalacion y arranque

### Requisitos

- Node.js 20+
- npm 10+

### Pasos

1. Instalar dependencias.

```bash
npm install
```

2. Configurar entorno local.

```bash
cp .env.example .env.local
```

3. Iniciar en desarrollo.

```bash
npm run dev
```

## Variables de entorno

Solo nombres de keys. No guardar valores en este archivo.

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GEMINI_API_KEY
- GEMINI_MODEL
- NEXT_ALLOWED_DEV_ORIGINS
- E2E_EMAIL
- E2E_PASSWORD

Notas:

- GEMINI_API_KEY es opcional; sin esta key se usa solo catalogo local CIE.
- NEXT_ALLOWED_DEV_ORIGINS aplica en desarrollo para accesos de red local.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:e2e:headed
```

## Base de datos y SQL

Script consolidado para despliegue completo:

- lib/supabase/000_production_full_schema.sql

Incluye:

- tablas de dominio clinico,
- RLS por tenant,
- audit_logs append-only,
- follow_up_tasks,
- api_rate_limits,
- RPC public.claim_api_rate_limit(...).

Scripts historicos de referencia:

- lib/supabase/001_init_schema.sql
- lib/supabase/002_iteration2_followups.sql
- lib/supabase/003_iteration3_patients.sql
- lib/supabase/004_cie_rate_limits.sql

## Testing y calidad

Checklist recomendada antes de merge:

```bash
npm run lint
npm run typecheck
npm run test
```

## Estructura del proyecto

```text
/
├── app/
├── components/
│   ├── clinical/
│   └── ui/
├── lib/
│   ├── consultations/
│   ├── db/
│   ├── supabase/
│   └── sync/
├── tests/
├── types/
└── public/
```

## Roadmap

Pendientes principales:

- Consolidacion de patrones en components/ui.
- Revision formal de accesibilidad (teclado, foco, contraste, jerarquia).
- Validacion UX mobile en flujos largos.
- Cobertura explicita de estados vacio/carga/error en flujos core.

Backlog detallado:

- TASKLIST_PRIORIZADO.md

## Control operativo en Notion

Este README esta alineado con tu estructura operativa de Notion:

- Resumen general
- Stack tecnologico
- Servicios de terceros
- Task list por prioridad
- Ideas y features
- Bugs e issues
- Variables de entorno
- Notas y decisiones tecnicas
- Metricas y objetivos
- Changelog

## Changelog

### 2026-04-27

- Refactor continuo del wizard con extraccion a hooks/helpers.
- Endurecimiento de sync con estado abandoned y mejoras en UI/metricas.
- SQL consolidado actualizado con api_rate_limits y claim_api_rate_limit.

### 2026-04-26

- Ajustes como ruta canonica de perfil profesional.
- Mejoras de consistencia visual y copy accionable.
