# Tasklist Canónico de Mejora

Este es el único tasklist activo del proyecto. Muestra lo que está en progreso, las tareas manuales requeridas por el usuario y archiva el historial de lo ya completado.

## Fase Actual: Migración a Vertical Slices (Prioridad Máxima)

- [x] **Fase 0: Preparación de Dependencias**
  - [x] Instalar herramientas para manejo robusto de formularios: `npm install react-hook-form @hookform/resolvers zod`
  - [x] Instalar manejador de fechas (recomendado): `npm install date-fns` (o `dayjs` si se prefiere).
  - [x] Verificar instalación de componentes puros faltantes: `npx shadcn@latest add sheet`
- [x] **Fase 1: Migración de Tipos de Dominio (Modelos)**
  - [x] Crear subdirectorios de tipos: `/src/features/patients/types`, `/src/features/consultations/types`, etc.
  - [x] Mover `src/types/patient.ts` -> `/src/features/patients/types/index.ts`
  - [x] Mover `src/types/consultation.ts` -> `/src/features/consultations/types/index.ts`
  - [x] Mover `src/types/clinical.ts` -> `/src/features/consultations/types/clinical.ts`
  - [x] Buscar y corregir todas las importaciones rotas tras el movimiento.
- [x] **Fase 2: Purgar Componentes de Dominio de `components/ui`**
  - [x] Mover `auth-form.tsx`, `auth-route-shell.tsx`, `logout-button.tsx` a `/src/features/auth/components/`
  - [x] Mover `dashboard-onboarding-guard.tsx`, `sidebar.tsx`, `global-search.tsx` a `/src/features/dashboard/components/`
  - [x] Mover `professional-profile-form.tsx` y sections a `/src/features/dashboard/components/` (o feature `/profile/`)
  - [x] Crear `/src/features/sync/components/` y mover componentes de sincronización.
  - [x] Corregir importaciones en `src/app/` y subcomponentes.
- [x] **Fase 3: Reubicación de Lógica (DB, Local Data y Actions)**
  - [x] Auditar `src/lib/actions` y `src/lib/db`.
  - [x] Mover lógicas de DB específicas a `/src/features/[feature]/api/` o `/src/features/[feature]/lib/`.
  - [x] Mover almacenamiento local de `src/lib/local-data` a `/src/features/[feature]/lib/local.ts`.
  - [x] Limpiar `src/lib/` dejando solo utilidades genéricas.
- [x] **Fase 4: Limpieza de Rutas (Next.js App Router)**
  - [x] Revisar `/src/app/(auth)/*` y refactorizar para importar solo la vista.
  - [x] Revisar `/src/app/(dashboard)/*` y extraer lógica compleja a las features.
- [x] **Fase 5: Refactorización de Formularios (Opcional)**
  - [x] Refactorizar `auth-form.tsx` con `react-hook-form` y `zod`.

## Fase Siguiente: Despliegue y Pulido Final (Fase 6)

- [x] **[UI/UX] Pulido General:** Revisar espaciados, contrastes y consistencia de componentes `shadcn/ui` en vistas móviles y de escritorio para una experiencia "Cero Curva de Aprendizaje".
- [x] **[PERFORMANCE] Optimización de Carga:** Analizar el bundle de Webpack, optimizar imágenes y diferir la carga de librerías pesadas (ej. `jspdf`, `stripe-js`).
- [ ] **[QA] Pruebas End-to-End de Pagos:** Verificar el flujo completo desde el registro hasta el pago y redirección exitosa usando tarjetas de prueba de Stripe.
- [x] **[DEVOPS] CI/CD y Despliegue:** Preparar el proyecto para producción en Vercel verificando que el build y el typcheck de Next.js pasen correctamente y la PWA compile sin errores.

## Intervención Manual del Usuario (To-Do List)

Estas tareas requieren tu acceso a consolas externas (Stripe, Supabase, Resend, Vercel) y **NO** pueden ser automatizadas por el agente:

- [ ] **Stripe - Productos y Precios:**
  1. Entra a tu Dashboard de Stripe (Modo Prueba para empezar).
  2. Crea un producto llamado "Plan Profesional Independiente" con precio de $29/mes (recurrente).
  3. Copia el ID del precio (empieza con `price_...`) y actualízalo en el archivo `src/app/(dashboard)/billing/page.tsx` donde dice `"price_placeholder_123"`.
- [ ] **Stripe - Webhooks:**
  1. Registra un Webhook URL en Stripe que apunte a `https://<tu-dominio>/api/stripe/webhook`.
  2. Suscríbete a los eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
  3. Obtén el secreto de firma (`STRIPE_WEBHOOK_SECRET`).
- [ ] **Supabase - Configuración de Dominio:**
  1. Configura la URL del sitio (`Site URL`) y las Redirect URLs en *Authentication -> URL Configuration* para que los enlaces de confirmación por correo apunten a tu dominio real (y no a `localhost`).
- [ ] **Resend - Verificación de Dominio:**
  1. Verifica tu dominio emisor en Resend (ej. `no-reply@glyph-app.com`) agregando los registros DNS correspondientes para evitar que los correos de PDF (recetas) y confirmaciones lleguen a spam.
- [ ] **Variables de Entorno (Producción):**
  1. Configura de forma segura las variables de entorno en tu plataforma de hosting (Vercel):
     - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (Oculta, nunca pública)
     - `RESEND_API_KEY`
     - `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_SITE_URL` (Debe ser tu dominio, ej. `https://glyph-app.com`)
     - `GEMINI_API_KEY` (Asegurar límites de uso en Google AI Studio)

---

## Historial de Fases Completadas

<details>
<summary><strong>Ver historial detallado de tareas completadas</strong></summary>

### Fase 5: Onboarding B2B/B2C e Integración Stripe
- [x] **[ONBOARDING] Pantallas de Venta B2B/B2C**
- [x] **[INFRAESTRUCTURA] Integración Stripe**
- [x] **[AUTORIZACIÓN] RBAC por Suscripción**

### Fase Previa 2: Alineación Arquitectónica y Sistema de Diseño (ADR-001) [Abril 2026]
- [x] **[ARQUITECTURA] Migración a Vertical Slices:** Mover `app/` a `src/app/`, extraer dominios hacia `/src/features/*`.
- [x] **[INFRAESTRUCTURA] Resolución de Dependencias:** Instalar React Query, Supabase SSR, shadcn, Resend.
- [x] **[CORE] Inicializar shadcn/ui:** Setup de CLI y regenerar componentes.
- [x] **[CORE] Setup de Supabase SSR:** Clientes server, client, middleware.
- [x] **[CORE] Proveedor Global React Query.**
- [x] **[MIGRACIÓN] Refactorización de Estado (Pacientes y Consultas):** Caché global optimista.
- [x] **[SEGURIDAD] Protección de Rutas con @supabase/ssr.**
- [x] **[INFRAESTRUCTURA] Resend Integration para PDFs.**

### Auditoría de Código y Deuda Técnica
- [x] Sincronización Offline-First y Rendimiento (OOM Mitigation IndexDB).
- [x] Crash por OOM en PDF (Compresión Canvas API).
- [x] Arquitectura React 19 y Clean Code (Eliminar anti-patrones en efectos).
- [x] Seguridad y Disponibilidad (Circuit Breaker para Gemini API).
- [x] Tipados Inseguros en Base de Datos (Type Guard Exhaustivo).
- [x] Limpieza de Código Muerto y optimización de loggers.

### Correcciones Pre-Producción y Optimizaciones
- [x] Eliminación de estado mutable en Route Handlers.
- [x] Añadir cabeceras `Retry-After: 60`.
- [x] Eliminar datos PHI huérfanos.
- [x] Guardas de entorno y mejoras de entropía.
- [x] Cabeceras de seguridad HTTP estandar.

### Plan de Remediación de Seguridad
- [x] Envolver la clave AES de IndexedDB con WebCrypto AES-KW.
- [x] Purgar dependencias innecesarias, archivos huérfanos y tipos sin uso.

### 1. Infraestructura, PWA y Base de Datos (Fases Iniciales)
- [x] Inicializar Next.js 16 App Router + Tailwind.
- [x] Configurar PWA con `next-pwa` y fallback offline.
- [x] Crear estructura de carpetas por dominio (app, components, lib, types, public).
- [x] Implementar capa IndexedDB con stores espejo + `sync_queue`.
- [x] Agregar SQL inicial con tablas, RLS y `audit_logs` append-only.
- [x] Añadir cifrado de PHI en IndexedDB con WebCrypto AES-GCM.
- [x] Definir pipeline CI para lint, typecheck y build.

### 2. Autenticación y Sistema Multi-Tenant
- [x] Crear rutas base de auth/dashboard y vistas dinamicas de especialidades.
- [x] Integrar autenticacion real Supabase en UI de login.
- [x] Implementar registro completo y bootstrap de perfil tenant.

### 3. Consultas Clínicas, Pacientes y Evolución
- [x] Crear CRUD funcional de pacientes y consultas con persistencia local y sync.
- [x] Flujo guiado por pasos (wizard) para consultas.
- [x] CRUD de plantillas de tratamiento.
- [x] Timeline clinico por paciente y seguimientos sucesivos.

### 4. Inteligencia Artificial (CIE Asistido) y Documentos (PDF)
- [x] Implementar sugerencias CIE asistidas por Gemini con fallback local.
- [x] Crear generador PDF de consulta listo para impresion con membrete.

### 5. Estabilización, Refactoring y Pruebas
- [x] Añadir cobertura de pruebas unitarias y E2E (91/91 tests).
- [x] Se endureció la cola de sincronización con backoff persistente.
- [x] Cerrar brecha RLS por tenant en `clinical_records` y `specialty_data`.

</details>
