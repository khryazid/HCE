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
- Admin Panel (Super Admin)
- Testing y calidad
- Estructura del proyecto
- Roadmap
- Changelog

## Descripcion

HCE Multiespecialidad permite gestionar pacientes, consultas y seguimientos clinicos con soporte para trabajo offline, sincronizacion posterior, sugerencias CIE-10 asistidas por IA y generacion de PDF clinico multipagina.

## Estado actual

| Campo | Valor |
| --- | --- |
| Version | 1.0.0-rc.3 |
| Estado | Lista para Produccion |
| Repo | Pendiente de URL publica |
| URL de produccion | Pendiente |

Verificacion tecnica reciente:

- Typecheck global en verde (0 errores).
- Linter sin advertencias ni deuda tecnica (0 warnings, 0 unused vars).
- Suite de tests en verde (90 tests, 15 archivos, 100% integridad).
- Dev server iniciando correctamente en entorno local.
- Cero polling inactivo (paneles de estado 100% reactivos a eventos).

## Caracteristicas

- Autenticacion y registro con Supabase.
- Flujo de acceso separado en login y registro.
- Onboarding y perfil profesional centralizados en ajustes.
- Dashboard con KPIs clinicos, actividad y alertas.
- Wizard de consulta por pasos con modo consulta y seguimiento.
- Selector de especialidad dinamico (usa las especialidades del medico, no valores hardcodeados).
- Selector de estado clinico del paciente al cerrar consulta (actualiza automaticamente el perfil del paciente).
- Seccion de Evolucion Clinica visible solo en modo seguimiento, con chips de estado rapido y contexto de la consulta anterior.
- Sugerencias CIE-10 asistidas exclusivamente por Gemini AI (con retry automatico en 503).
- Especialidad real del medico enviada a Gemini como contexto (no hardcodeada).
- Campos de antecedentes y plan de manejo con listas de bullets automaticas al presionar Enter.
- Campo T.A. con autoformato inteligente (espacio o 3 digitos insertan la barra automaticamente).
- Campos de fecha con mascara DD/MM/AAAA (sin selector de calendario nativo).
- Auto-scroll al primer campo invalido al intentar guardar con campos obligatorios vacios.
- Hoja de instrucciones al paciente separada de la receta medica (privacidad ante la farmacia).
- PDF clinico de 3 paginas: historia clinica, receta para farmacia, hoja del paciente.
- Pacientes como historial clinico navegable con timeline.
- Modulo de tratamientos con CRUD por medico.
- Persistencia local en IndexedDB con cifrado PHI.
- Cola de sincronizacion con backoff por item y estado terminal abandoned.
- Dependency guard en sync worker: salta registros hijos si el paciente padre falla.
- Soporte PWA y pantalla offline.
- Super Admin Panel interno para gestion de suscripciones sin tocar codigo ni la base de datos.

## Stack tecnologico

### Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS

### Backend y dominio

- API routes en Next.js
- Server Actions para mutaciones del Admin Panel
- Supabase Auth
- Multi-tenant por doctor y clinica

### Base de datos

- PostgreSQL en Supabase
- RLS por tenant
- RPC para rate limit de CIE
- Service Role Key solo en servidor (admin panel)

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
- Admin panel protegido: la ruta /admin verifica en el servidor que el usuario autenticado sea el superadmin. Cualquier otro usuario es redirigido silenciosamente al dashboard.

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

3. Rellenar las variables en `.env.local` (ver seccion siguiente).

4. Iniciar en desarrollo.

```bash
npm run dev
```

## Variables de entorno

Solo nombres de keys. No guardar valores en el repositorio.

| Variable | Requerida | Descripcion |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Si | URL del proyecto Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Si | Clave anonima de Supabase (publica) |
| GEMINI_API_KEY | Si | Clave de Google AI Studio para sugerencias CIE-10 |
| GEMINI_MODEL | No | Modelo de Gemini a usar (default: gemini-2.0-flash) |
| SUPABASE_SERVICE_ROLE_KEY | Solo admin | Clave de rol de servicio para el Admin Panel. Nunca exponerla al cliente. Obtenerla en Supabase → Project Settings → API → service_role |
| NEXT_ALLOWED_DEV_ORIGINS | No | Origenes permitidos para acceso de red local en desarrollo |
| E2E_EMAIL | Solo tests | Credenciales para los tests E2E de Playwright |
| E2E_PASSWORD | Solo tests | Credenciales para los tests E2E de Playwright |

Notas:

- GEMINI_API_KEY es requerida para sugerencias CIE. Sin ella la API retorna sugerencias vacias.
- GEMINI_MODEL permite cambiar el modelo sin redeployar. Ver modelos en aistudio.google.com.
- SUPABASE_SERVICE_ROLE_KEY es exclusiva del servidor (Server Actions). No tiene prefijo NEXT_PUBLIC_ por disenio.

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

Script consolidado e idempotente para despliegue completo (nuevo proyecto o actualizacion):

```
src/lib/supabase/000_production_full_schema.sql
```

Ejecutar en: **Supabase → SQL Editor → New query → pegar y ejecutar**.

Incluye:

- Tablas: `profiles`, `patients`, `clinical_records`, `specialty_data`, `audit_logs`, `follow_up_tasks`, `api_rate_limits`
- Columna `subscription_expires_at` en `profiles` (para planes con duracion definida)
- Valor `lifetime` en el CHECK de `subscription_status`
- RLS por tenant en todas las tablas
- `audit_logs` append-only (UPDATE y DELETE bloqueados por RLS)
- Triggers de `updated_at` automaticos
- Funciones RPC: `log_audit_event`, `claim_api_rate_limit`
- Vista materializada `mv_dashboard_kpis_daily` con instruccion de cron

El archivo usa `IF NOT EXISTS` y `DROP ... IF EXISTS` en todo, por lo que es seguro re-ejecutarlo sobre una base ya poblada sin perder datos.

## Admin Panel (Super Admin)

Panel privado de administracion de usuarios y suscripciones. Solo accesible para el email configurado como superadmin.

### Como entrar

1. Asegurate de tener `SUPABASE_SERVICE_ROLE_KEY` en tu `.env.local` (ver Variables de entorno).
2. Inicia sesion en la app con el correo `khristian.yazid@gmail.com`.
3. Navega directamente a: `http://localhost:3000/admin` (desarrollo) o `https://tu-dominio.com/admin` (produccion).
4. Cualquier otro usuario que intente acceder sera redirigido silenciosamente al dashboard.

### Funcionalidades

| Funcion | Detalle |
| --- | --- |
| Stats globales | Total de usuarios, activos, lifetime, inactivos, sin plan |
| Buscador | Filtra por nombre, email o especialidad en tiempo real |
| Ver estado de suscripcion | Plan actual y fecha de expiracion por usuario |
| Activar plan Normal | Activo por 7 / 15 / 30 / 90 / 180 / 365 dias o 10 anos |
| Dar Lifetime | Acceso permanente sin fecha de expiracion |
| Desactivar cuenta | Cambia estado a Inactivo |
| Eliminar cuenta | Doble confirmacion: escribe ELIMINAR para confirmar. Borra perfil y usuario de auth |

### Configuracion necesaria en Supabase (una sola vez)

1. Ejecutar el schema completo `000_production_full_schema.sql` (ya incluye `subscription_expires_at` y el valor `lifetime`).
2. Ir a Supabase → **Project Settings → API** → copiar la `service_role` key.
3. Pegarla en `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...tu-key...
```

### Archivos clave del admin panel

| Archivo | Proposito |
| --- | --- |
| `src/features/admin/actions.ts` | Server Actions: autenticacion, queries y mutaciones con Service Role |
| `src/app/(dashboard)/admin/page.tsx` | Pagina servidor con guard de acceso y Suspense |
| `src/app/(dashboard)/admin/admin-client.tsx` | UI del panel: tabla, buscador, modales de confirmacion |

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
│   │   ├── api/              # API routes (cie-suggestions, etc.)
│   │   └── (dashboard)/
│   │       └── admin/        # Super Admin Panel (acceso restringido)
│   ├── components/           # Componentes UI compartidos
│   ├── features/             # Vertical slices por dominio
│   │   ├── admin/            # Server Actions del panel administrativo
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
│   │   ├── supabase/         # Cliente, schema SQL (000_production_full_schema.sql)
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
- Activacion de entorno de produccion real para Base de Datos y APIs.
- Despliegue en Vercel con variables de entorno de produccion.
- Cron job en Supabase para refrescar `mv_dashboard_kpis_daily` (instruccion incluida en el SQL).

## Changelog

### 2026-04-30 (RC3 — Admin Panel y UX Clinica)

- **Super Admin Panel:** Nueva ruta `/admin` accesible solo para el superadmin. Permite ver todos los usuarios, cambiar planes (activo por N dias, lifetime, inactivo) y eliminar cuentas con doble confirmacion. Usa Service Role Key de Supabase via Server Actions, nunca expuesta al cliente.
- **Especialidades dinamicas:** El selector de especialidad en el wizard ahora muestra las especialidades reales del medico (configuradas en su perfil), no opciones genericas hardcodeadas.
- **Estado clinico del paciente:** Nuevo selector al cerrar consulta (Alta Medica, En Seguimiento, etc.). Al guardar, actualiza automaticamente el perfil del paciente sin pasos adicionales.
- **Evolucion desacoplada:** La seccion de Evolucion Clinica solo aparece en modo seguimiento. Proxima Cita y Estado del Paciente son siempre visibles al final del wizard.
- **Titulos de seccion visibles en dark mode:** Clases `dark:text-teal-400` añadidas a todos los H4 del wizard.
- **SQL unificado:** `000_production_full_schema.sql` ahora incluye `subscription_expires_at`, valor `lifetime` en constraints y todos los indices. Archivo de migracion parcial eliminado.
- **Fix TS:** Corregidos 3 errores de TypeScript: import incorrecto del server client, dependencia inexistente `react-hot-toast` reemplazada por `sonner`, y `SpecialtyKind` ampliado para soportar especialidades personalizadas del tenant.

### 2026-04-30 (RC2 — Limpieza de produccion)

- **Eliminado catalogo local CIE-10:** Removido `cie-catalog.ts` y toda logica de fallback. Las sugerencias CIE son exclusivamente por Gemini AI.
- **PDF multipagina final:** Formato visual pulido con correccion de alineaciones, bloques de firma responsivos, manejo dinamico de desbordamiento de pagina y separacion absoluta entre paciente (receta + indicaciones) y paraclinicos (ordenes de laboratorio e imagenologia).
- **Examen Fisico Estructurado:** Nuevo UI por sistemas para el examen fisico en el Wizard. Soporta compatibilidad hacia atras en la generacion de PDFs historicos.
- **UX clinica:** Listas de bullets automaticas en antecedentes y plan de manejo al presionar Enter. Autoformato inteligente en campo T.A.
- **Limpieza exhaustiva (Deuda Tecnica Cero):** Eliminadas todas las variables sin uso, `any` types estrictos corregidos, advertencias de efectos asincronos parcheados y remocion de carpetas vacias / prototipos muertos.
- **Correccion critica Vitest:** El alias `@` apuntaba a la raiz del proyecto en lugar de `./src`.
- **Especialidad real en Gemini:** El prompt de CIE ahora envia la especialidad registrada del medico en lugar de siempre "medicina-general".

### 2026-04-29 (Estabilizacion)

- **Sincronizacion:** Dependency guard en sync worker previene violaciones de FK cuando el paciente padre falla.
- **Resiliencia CIE API:** Retry automatico (1 vez, delay 1.2s) en errores 503. Graceful degradation al 200 con array vacio si Gemini no responde.
- **Fechas:** Reemplazado input nativo `type="date"` por input de texto con mascara DD/MM/AAAA en todos los campos de fecha del wizard.

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
