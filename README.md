# HCE Multiespecialidad (SaaS Nivel 2)

Plataforma de gestion de historias clinicas multiespecialidad construida con:

- Next.js (App Router) + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- IndexedDB (`idb`) para persistencia local
- `next-pwa` para arquitectura offline-first

## Estado de la Implementacion

Esta iteracion deja operativa una version funcional offline-first:

- Autenticacion real con Supabase (registro e inicio de sesion).
- Registro de medico con soporte de multiples especialidades.
- Flujos de acceso separados: `/login` y `/registro`.
- Onboarding inicial obligatorio de perfil profesional del medico.
- Dashboard con carga de perfil tenant y especialidades del medico.
- Dashboard con KPIs clinicos, actividad reciente y alertas operativas.
- Flujo de consulta guiado en 4 pasos con paciente rapido, diagnostico CIE y confirmacion.
- Sugerencias CIE asistidas por Gemini con fallback al catalogo local.
- Selector de tipo de registro en Consultas: consulta completa o seguimiento con foco en evolucion.
- Indicador de seguimiento pendiente al seleccionar paciente y alta rapida de control.
- Acceso directo desde historial de pacientes para abrir seguimiento precargado sin pasar por el paso 1.
- Modulo de tratamientos predeterminados con CRUD y versionado por medico.
- Timeline de evolucion/seguimiento por paciente.
- Pacientes como historial clinico navegable; el alta se hace desde Consultas.
- Ajustes de membrete profesional y generacion PDF de consulta.
- Logo profesional local por medico (guardado en navegador, sin Supabase) para incluir en el PDF.
- CRUD local-first de pacientes y consultas.
- Cifrado local de PHI con WebCrypto (AES-GCM).
- Cola de sincronizacion con panel visual para reintento y descarte.
- PWA con fallback a `/offline`.
- SQL inicial de Supabase con RLS por `doctor_id` y auditoria append-only.

## Estructura Principal

```text
/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── pacientes/
│   │   ├── consultas/
│   │   └── especialidades/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── clinical/
├── lib/
│   ├── supabase/
│   ├── db/
│   └── sync/
├── types/
└── public/
```

## Variables de Entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
NEXT_ALLOWED_DEV_ORIGINS=
E2E_EMAIL=
E2E_PASSWORD=
```

`GEMINI_API_KEY` es opcional. Si no esta presente, la pantalla de consultas usa solo el catalogo local de CIE.

`NEXT_ALLOWED_DEV_ORIGINS` es opcional y solo aplica para `npm run dev`. Usa una lista separada por comas de hosts/origenes permitidos para recursos `/_next` en red local (por ejemplo: `192.168.0.149,mi-host.local`).

`E2E_EMAIL` y `E2E_PASSWORD` se usan para pruebas Playwright reales. Si no estan definidos, los tests E2E autenticados se marcan como omitidos.


## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Skill Frontend del Proyecto

Para mantener consistencia de UI/UX en nuevas pantallas y ajustes visuales, usar esta guia:

- `FRONTEND_SKILL.md`

## SQL Supabase (Produccion)

El script consolidado para montar todo en una sola ejecucion esta en:

- `lib/supabase/000_production_full_schema.sql`

Scripts historicos (opcional, referencia):

- `lib/supabase/001_init_schema.sql`
- `lib/supabase/002_iteration2_followups.sql`

Incluye:

- tablas de dominio clinico,
- politicas RLS para aislamiento por tenant,
- `audit_logs` inmutable,
- funcion `log_audit_event(...)` con hash encadenado.

## Siguientes pasos recomendados

1. Implementar ajustes de membrete profesional por medico para salida PDF.
2. Construir flujo guiado de nueva consulta por pasos.
3. Añadir timeline de evolucion y seguimiento por paciente.
