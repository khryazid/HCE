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
| Version | 1.0.0-rc.1 |
| Estado | Lista para Produccion (Code Freeze) |
| Repo | Pendiente de URL publica |
| URL de produccion | Pendiente |

Verificacion tecnica reciente:

- Typecheck global en verde.
- Suite de tests en verde (91 tests).
- Dev server iniciando correctamente en entorno local.
- Cero polling inactivo (paneles de estado 100% reactivos a eventos).

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

- Fase actual de profesionalización clínica completamente terminada.
- *(Siguientes pasos se definirán en una nueva iteración de producto)*

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

### 2026-04-28 (Pre-Producción)

- **Code Freeze y Optimización Final:** Purga masiva de deuda técnica, eliminación de componentes y tipos huérfanos, y optimización severa de bundle.
- **Seguridad Serverless y Persistencia:** Eliminación de estado mutable en funciones edge/serverless, cierre de brechas de IndexedDB huérfana, envoltura AES-KW de alta entropía para claves IDB locales.
- **Auditoría e Integridad:** Implementadas cabeceras CSP, estandarización de logs y 100% de la suite de 91 pruebas en verde (`Exit code: 0` en Next build).

### 2026-04-28 (Iteración UX)

- Finalización de iteración UX profesional: accesibilidad estricta WCAG AA, eliminación de rutas residuales, y adición de métricas ligeras de UI.
- Eliminación de polling en segundo plano para ahorro de CPU/batería; los paneles de sincronización ahora son 100% dirigidos por eventos.
- Refactorización visual de Wizard y Tratamientos consolidando utilidades de diseño (hce-surface, hce-card).
- Cobertura de tests incrementada y tipado asegurado (91/91 tests pasando).

### 2026-04-27

- Refactor continuo del wizard con extraccion a hooks/helpers.
- Endurecimiento de sync con estado abandoned y mejoras en UI/metricas.
- SQL consolidado actualizado con api_rate_limits y claim_api_rate_limit.

### 2026-04-26

- Ajustes como ruta canonica de perfil profesional.
- Mejoras de consistencia visual y copy accionable.
