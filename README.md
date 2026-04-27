# HCE Multiespecialidad

Guia operativa para llevar control del proyecto en Notion.

## Resumen General

| Campo | Valor |
| --- | --- |
| Nombre | HCE Multiespecialidad |
| Version | 0.1.0 |
| Estado | Activo en refactor y endurecimiento operativo |
| Repo | Pendiente de registrar URL publica |
| URL de produccion | Pendiente |

### Verificacion rapida del estado actual

- Typecheck global en verde.
- Tests del bloque critico (wizard + sync) en verde.
- SQL consolidado actualizado con rate limiting compartido para API CIE.

## Stack Tecnologico

### Frontend

- [x] Next.js App Router
- [x] TypeScript
- [x] Tailwind CSS
- [x] PWA (next-pwa)
- [x] Vitest
- [x] Playwright

### Backend y Dominio

- [x] API routes en Next.js
- [x] Supabase Auth
- [x] Multi-tenant por doctor y clinica
- [x] Workflow clinico consulta/seguimiento

### Base de Datos

- [x] PostgreSQL en Supabase
- [x] RLS por tenant
- [x] audit_logs append-only
- [x] follow_up_tasks
- [x] api_rate_limits + RPC claim_api_rate_limit

### Infraestructura

- [x] Offline-first con IndexedDB
- [x] Cola de sync con reintentos y estado terminal abandoned
- [ ] Deploy productivo documentado
- [ ] Observabilidad formal (APM/logs centralizados)

## Servicios de Terceros

### Plataformas principales

| Servicio | Uso | Plan | Estado | Limites relevantes | Dashboard |
| --- | --- | --- | --- | --- | --- |
| Vercel | Hosting frontend y API routes | Pendiente confirmar | Pendiente | Build minutes, bandwidth | Pendiente |
| Supabase | Auth, Postgres, RLS, RPC | Pendiente confirmar | Activo | Conexiones, almacenamiento, rate limits plan | Pendiente |

### APIs y proveedores externos

| Servicio | Uso | Estado | Limite funcional | Fallback | Dashboard |
| --- | --- | --- | --- | --- | --- |
| Gemini API | Sugerencias CIE asistidas | Activo opcional | Rate limit por usuario via RPC | Catalogo CIE local | Pendiente |

## Task List

### Prioridad Alta 🔥

- [ ] Revisar estructura de components/ui para consolidar patrones y evitar estilos aislados.
- [ ] Revision formal de teclado, foco visible, contraste y jerarquia visual en auth, dashboard, consultas, pacientes y ajustes.
- [ ] Validar experiencia movil en listas largas, wizard clinico y panel de sincronizacion.
- [ ] Probar estados vacios, carga y error en cada flujo principal.

### Prioridad Media 🟡

- [ ] Revisar controles que dependen demasiado del color para comunicar estado.
- [ ] Formalizar observabilidad basica para errores de sync y API.

### Backlog 🟢

- [ ] Limpieza de rutas/paginas de soporte sin valor operativo claro.
- [ ] Segunda pasada UX enfocada en claridad clinica y velocidad.

### Completadas (ultimos hitos)

- [x] Separacion de useConsultationWizard en hooks y helpers menores.
- [x] Endurecimiento de sync con estado terminal abandoned.
- [x] Rate limiting CIE compartido en SQL via RPC.
- [x] Estandarizacion de copy de errores accionables.

## Ideas y Features

- [ ] Panel de observabilidad clinica con metricas de sync y API.
- [ ] Analitica de uso por modulo (dashboard, consultas, pacientes, ajustes).
- [ ] Exportacion de reportes operativos por periodo.
- [ ] Automatizacion de alertas de follow-up vencido.

## Bugs e Issues

| Fecha | Modulo | Severidad | Estado | Descripcion | Owner |
| --- | --- | --- | --- | --- | --- |
| 2026-04-27 | Dev server | Media | Abierto | npm run dev fallo en entorno local (revisar salida exacta y env) | Pendiente |

## Variables de Entorno

Solo nombres de keys, sin valores. Referenciar la base Secrets and Config en Notion.

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GEMINI_API_KEY
- GEMINI_MODEL
- NEXT_ALLOWED_DEV_ORIGINS
- E2E_EMAIL
- E2E_PASSWORD

## Notas y Decisiones Tecnicas

- Se adopto arquitectura offline-first con IndexedDB como fuente operativa local.
- La cola de sync usa backoff por item y separa fallo temporal de registro abandonado.
- El wizard clinico se descompuso en hooks/helpers para facilitar pruebas y mantenimiento.
- Se prioriza fallback local en CIE cuando Gemini no esta disponible.

## Metricas y Objetivos

| Metrica | Estado actual | Objetivo |
| --- | --- | --- |
| Usuarios activos | Pendiente instrumentacion | Definir baseline + crecimiento mensual |
| Uptime | Pendiente instrumentacion | >= 99.5% |
| LCP | Pendiente medicion en produccion | <= 2.5s |
| Conversion (registro a primera consulta) | Pendiente instrumentacion | Definir y mejorar trimestre a trimestre |

## Changelog

### 2026-04-27

- Refactor continuo del wizard: extracciones de dominio y custom hooks.
- Endurecimiento de sync con estado abandoned y mejoras de panel/metricas.
- SQL consolidado actualizado para incluir api_rate_limits y claim_api_rate_limit.

### 2026-04-26

- Ajustes como pagina canonica de perfil profesional.
- Mejoras de consistencia visual y copy accionable.
