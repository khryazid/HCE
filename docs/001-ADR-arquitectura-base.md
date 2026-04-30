# docs/001-ADR-arquitectura-base.md

## 1. Contexto
El proyecto es un sistema EHR (Electronic Health Record) multi-tenant con modelo de negocio SaaS (B2B para clínicas, B2C para médicos particulares). Requiere alta seguridad de datos médicos, aislamiento por inquilino (tenant), y una interfaz altamente responsiva con bajo costo operativo inicial.

## 2. Pila Tecnológica Aprobada
- **Framework Core:** Next.js (App Router) para SSR, SSG y rutas API integradas.
- **Base de Datos y BaaS:** Supabase (PostgreSQL). Se impone el uso estricto de Row Level Security (RLS) para garantizar que los datos de clínicas y pacientes estén aislados.
- **Autenticación:** Supabase Auth (Email/Password + SSO Google/Microsoft).
- **Manejo de Estado Asíncrono:** TanStack React Query para caché agresivo y UI instantánea.
- **Estilos y UI:** Tailwind CSS + shadcn/ui + Radix UI.
- **Generación de Documentos y Correos:** Generación de PDF en el cliente (ej. `jspdf` o `@react-pdf/renderer`) y Resend para envío de correos (capa gratuita).
- **Pagos:** Integración híbrida (Stripe/PayPal) y un flujo manual "Contactar a Ventas".

## 3. Arquitectura Defensiva: Vertical Slice Architecture
Se prohíbe la arquitectura en capas tradicional (separar todos los controladores de las vistas). El proyecto se estructurará por características comerciales (Features) para evitar la fragmentación del contexto de la IA.

Estructura de directorios forzada:
/src
  /features
    /auth
    /patients
    /consultations
    /prescriptions
    /billing
  /components (Solo componentes UI puros/genéricos)
  /lib        (Utilidades genéricas)

## 4. Convenciones de Nomenclatura Estrictas
- **Base de datos (Postgres):** `snake_case` (ej. `medical_records`, `clinic_id`).
- **Componentes React:** `PascalCase` (ej. `PatientCard.tsx`).
- **Variables y Funciones:** `camelCase` (ej. `fetchPatientData`).
- **Archivos de rutas (Next.js):** `kebab-case` (ej. `patient-profile/page.tsx`).