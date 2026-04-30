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

HCE Multiespecialidad permite gestionar pacientes, consultas y seguimientos clinicos con soporte para trabajo offline, sincronizacion posterior, sugerencias CIE-10 asistidas por IA y generacion de PDF clinico multipagina.

## Estado actual

| Campo | Valor |
| --- | --- |
| Version | 1.0.0-rc.2 |
| Estado | Lista para Produccion |
| Repo | Pendiente de URL publica |
| URL de produccion | Pendiente |

Verificacion tecnica reciente:

- Typecheck global en verde (0 errores).
- Linter sin advertencias ni deuda técnica (0 warnings, 0 unused vars).
- Suite de tests en verde (90 tests, 15 archivos, 100% integridad).
- Dev server iniciando correctamente en entorno local.
- Cero polling inactivo (paneles de estado 100% reactivos a eventos).

## Caracteristicas

- Autenticacion y registro con Supabase.
- Flujo de acceso separado en login y registro.
- Onboarding y perfil profesional centralizados en ajustes.
- Dashboard con KPIs clinicos, actividad y alertas.
- Wizard de consulta por pasos con modo consulta y seguimiento.
- Sugerencias CIE-10 asistidas exclusivamente por Gemini AI (con retry automatico en 503).
- Especialidad real del medico enviada a Gemini como contexto (no hardcodeada).
- Campos de antecedentes y plan de manejo con listas de bullets automaticas al presionar Enter.
- Campo T.A. con autoformato inteligente (espacio o 3 digitos insertan la barra automaticamente).
- Campos de fecha con mascara DD/MM/AAAA (sin selector de calendario nativo).
- Hoja de instrucciones al paciente separada de la receta medica (privacidad ante la farmacia).
- PDF clinico de 3 paginas: historia clinica, receta para farmacia, hoja del paciente.
- Pacientes como historial clinico navegable con timeline.
- Modulo de tratamientos con CRUD por medico.
- Persistencia local en IndexedDB con cifrado PHI.
- Cola de sincronizacion con backoff por item y estado terminal abandoned.
- Dependency guard en sync worker: salta registros hijos si el paciente padre falla.
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

### IA

- Google Gemini (gemini-2.0-flash por defecto)
- Graceful degradation: retorna sugerencias vacias si Gemini no responde

### Calidad

- Vitest para unit e integration tests
- Playwright para E2E
- ESLint + TypeScript strict checks

## Arquitectura

- Offline-first: la app guarda localmente y sincroniza por cola cuando hay conectividad.
- Sync robusto: diferencia entre fallo temporal y registro abandonado. Si un paciente falla, sus consultas dependientes se saltan en esa pasada (FK guard).
- Dominio desacoplado: el wizard de consultas fue dividido en hooks y helpers testeables.
- IA sin fallback de catalogo: si Gemini no responde, retorna array vacio y el UI informa al usuario.

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
- GEMINI_MODEL (opcional, default: gemini-2.0-flash)
- NEXT_ALLOWED_DEV_ORIGINS
- E2E_EMAIL
- E2E_PASSWORD

Notas:

- GEMINI_API_KEY es requerida para sugerencias CIE. Sin ella la API retorna sugerencias vacias.
- GEMINI_MODEL permite cambiar el modelo sin redeployar. Ver modelos disponibles en aistudio.google.com.
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
├── src/
│   ├── app/                  # App Router (Next.js)
│   │   └── api/              # API routes (cie-suggestions, etc.)
│   ├── components/           # Componentes UI compartidos
│   ├── features/             # Vertical slices por dominio
│   │   ├── auth/             # Autenticacion y sesion
│   │   ├── billing/          # Stripe y suscripciones
│   │   ├── consultations/    # Wizard, CIE, PDF, sync
│   │   ├── dashboard/        # KPIs y metricas
│   │   ├── patients/         # Historial clinico
│   │   └── sync/             # UI del estado de sincronizacion
│   ├── lib/                  # Utilitarios globales
│   │   ├── constants/        # Constantes de dominio
│   │   ├── db/               # IndexedDB + crypto
│   │   ├── observability/    # Logging y eventos de app
│   │   ├── supabase/         # Cliente y schema SQL
│   │   ├── sync/             # Cola de sincronizacion offline
│   │   └── ui/               # Helpers de formato y UI
│   └── types/                # Tipos Supabase generados
├── tests/                    # Unit e integration tests (Vitest)
├── tests/e2e/                # E2E tests (Playwright)
└── public/                   # Assets estaticos y PWA manifest
```

## Roadmap

Pendientes principales:

- QA E2E de flujo completo en staging.
- Activar y probar flujo completo de Stripe (SDK ya integrado, falta configuracion de productos/precios).
- Activación de entorno de producción real para Base de Datos y APIs.
- Despliegue en Vercel con variables de entorno de produccion.

## Control operativo en Notion

Este README esta alineado con la estructura operativa de Notion:

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

### 2026-04-30 (RC2 — Limpieza de produccion)

- **Eliminado catalogo local CIE-10:** Removido `cie-catalog.ts` y toda logica de fallback. Las sugerencias CIE son exclusivamente por Gemini AI.
- **PDF multipagina final:** Formato visual pulido con corrección de alineaciones, bloques de firma responsivos, manejo dinámico de desbordamiento de página y separación absoluta entre paciente (receta + indicaciones) y paraclínicos (órdenes de laboratorio e imagenología).
- **Examen Físico Estructurado:** Nuevo UI por sistemas para el examen físico en el Wizard. Soporta compatibilidad hacia atrás en la generación de PDFs históricos.
- **UX clinica:** Listas de bullets automaticas en antecedentes y plan de manejo al presionar Enter. Autoformato inteligente en campo T.A.
- **Limpieza exhaustiva (Deuda Técnica Cero):** Eliminadas todas las variables sin uso (`unused vars`), `any` types estrictos corregidos, advertencias de efectos asíncronos parcheados y remoción de carpetas vacías / prototipos muertos (ej: modulo independiente de recetas).
- **Correccion critica Vitest:** El alias `@` apuntaba a la raiz del proyecto en lugar de `./src`.
- **Especialidad real en Gemini:** El prompt de CIE ahora envia la especialidad registrada del medico (ej. "Ortopedia y Traumatologia") en lugar de siempre "medicina-general".
- **Tests actualizados:** Ajustados tests de CIE para reflejar comportamiento de graceful degradation y validaciones de PDF para el nuevo modelo del examen físico estructurado.

### 2026-04-29 (Estabilizacion)

- **Sincronizacion:** Dependency guard en sync worker previene violaciones de FK cuando el paciente padre falla. Los hijos quedan pending para el siguiente flush.
- **Resiliencia CIE API:** Retry automatico (1 vez, delay 1.2s) en errores 503. Graceful degradation al 200 con array vacio si Gemini no responde.
- **Fechas:** Reemplazado input nativo `type="date"` por input de texto con mascara DD/MM/AAAA en todos los campos de fecha del wizard (nacimiento y proxima cita).

### 2026-04-28 (Pre-Produccion)

- **Code Freeze y Optimizacion Final:** Purga masiva de deuda tecnica, eliminacion de componentes y tipos huerfanos, optimizacion severa de bundle.
- **Seguridad Serverless y Persistencia:** Eliminacion de estado mutable en funciones edge/serverless, cierre de brechas de IndexedDB huerfana, envoltura AES-KW de alta entropia para claves IDB locales.
- **Auditoria e Integridad:** Implementadas cabeceras CSP, estandarizacion de logs y suite de 91 pruebas en verde.

### 2026-04-27

- Refactor continuo del wizard con extraccion a hooks/helpers.
- Endurecimiento de sync con estado abandoned y mejoras en UI/metricas.
- SQL consolidado actualizado con api_rate_limits y claim_api_rate_limit.

### 2026-04-26

- Ajustes como ruta canonica de perfil profesional.
- Mejoras de consistencia visual y copy accionable.
