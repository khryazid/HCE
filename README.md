<div align="center">
  <img src="./public/logo.png" alt="Glyphix Logo" width="150" />
  <h1>Glyphix — Motor Clínico Inteligente ⚕️</h1>
  
  <p>
    <strong>El SaaS Médico definitivo: Offline-First, IA-Powered y Multi-tenant.</strong>
  </p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" /></a>
    <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-Billing-6772E5?style=for-the-badge&logo=stripe" alt="Stripe" /></a>
    <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/QA-Playwright-2EAD33?style=for-the-badge&logo=playwright" alt="Playwright" /></a>
    <br/>
    <img src="https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square" alt="Build Status" />
    <img src="https://img.shields.io/badge/Coverage-47%25-brightgreen?style=flat-square" alt="Coverage" />
    <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License" />
  </p>
</div>

---

## 📑 Tabla de Contenidos

1. [🌟 Visión General](#-visión-general)
2. [✨ Características Principales](#-características-principales)
3. [🏗️ Arquitectura y Flujo de Datos](#️-arquitectura-y-flujo-de-datos)
4. [🛡️ Seguridad y Modelo Multi-Tenant](#️-seguridad-y-modelo-multi-tenant)
5. [🛠️ Stack Tecnológico](#️-stack-tecnológico)
6. [📁 Estructura del Proyecto](#-estructura-del-proyecto)
7. [🚀 Guía de Inicio Rápido (Desarrollo)](#-guía-de-inicio-rápido-desarrollo)
8. [🧪 Testing y QA](#-testing-y-qa)
9. [🤝 Guía de Contribución](#-guía-de-contribución)
10. [📚 Documentación Extendida](#-documentación-extendida)

---

## 🌟 Visión General

**Glyphix** no es solo un sistema de historias clínicas; es un **Motor Clínico Resiliente**. Diseñado para garantizar la continuidad operativa en entornos médicos críticos, Glyphix funciona bajo el paradigma **Offline-First**. Si el internet de la clínica falla, el sistema sigue funcionando a 0ms de latencia, sincronizando los datos encriptados con la nube en el momento en que se recupera la conexión.

Construido para escalar, maneja desde consultorios independientes hasta redes de clínicas completas, integrando facturación automatizada, inteligencia artificial para codificación de diagnósticos y cumplimiento estricto de privacidad.

---

## ✨ Características Principales

- **⚡ Offline-First Real:** Lectura/Escritura directa contra IndexedDB local. Sync Worker en segundo plano con estrategia de *backoff exponencial*.
- **🤖 Asistente IA (CIE-11):** Integración nativa con *Gemini 2.0 Flash* para sugerencia de diagnósticos médicos en tiempo real leyendo la anamnesis.
- **🏢 Multi-Tenant RLS:** Aislamiento criptográfico de datos por clínica (Tenant) directamente en el motor de PostgreSQL usando Row Level Security.
- **🔐 RBAC Granular:** 8 roles distintos (Owner, Doctor, Asistente, Laboratorio, etc.) con Route Guards gestionados vía SSR (Next.js Middleware).
- **💸 Facturación Automatizada:** Motor de caja y turnos aislados (`cash_shifts`), suscripciones SaaS gestionadas mediante Stripe.
- **📄 Expedientes Seguros (Client-Side):** Generación de PDFs y exportación de archivos ZIP directamente en el navegador del usuario para cumplir normas HIPAA/GDPR.

---

## 🏗️ Arquitectura y Flujo de Datos

El sistema está diseñado para resiliencia extrema. El cliente PWA nunca se bloquea esperando a la red.

```mermaid
graph TD
    Client[📱 Cliente Next.js 16 / React 19]
    IDB[(🗄️ IndexedDB Local)]
    SW[⚙️ Sync Worker / Cola de Reintentos]
    SupabaseDB[(☁️ PostgreSQL + RLS)]
    Auth[🔑 Supabase Auth SSR]
    AI[🧠 Gemini API]
    RT[📡 Supabase Realtime (WebSockets)]

    Client <-->|Latencia 0ms| IDB
    IDB -->|Background Sync| SW
    SW -->|Upsert seguro| SupabaseDB
    Client -->|Protección de Rutas| Auth
    Client -->|Análisis de texto| AI
    SupabaseDB -->|Actualizaciones Agenda| RT
    RT -->|UI Reactiva| Client
```

Para más detalles técnicos, consulta [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 🛡️ Seguridad y Modelo Multi-Tenant

La seguridad no se maneja en el frontend, se impone en la base de datos. Cada petición pasa por las políticas RLS (Row Level Security) de Supabase, asegurando que:
- El usuario está autenticado.
- El usuario pertenece a la `organization_id` (Clínica) que intenta consultar.
- El `role_id` del usuario tiene permisos para esa acción específica.

*(Es matemáticamente imposible que una clínica exponga datos a otra).*

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología Principal | Propósito |
|---|---|---|
| Frontend UI | Next.js 16 (App Router), React 19 | Interfaz de usuario SSR y Client Components |
| Estilos | Tailwind CSS v4, Lucide Icons | Diseño adaptativo y mobile-first |
| Base de Datos | PostgreSQL (Supabase), IndexedDB | Estado remoto multi-tenant y estado local offline |
| Data Fetching | TanStack Query v5 | Gestión de caché de UI y server state |
| IA & Pagos | Gemini 2.0 Flash, Stripe API | Sugerencias médicas y cobro de suscripciones |
| Testing | Vitest, Playwright | Pruebas unitarias de lógica de negocio y End-to-End |

---

## 📁 Estructura del Proyecto

El código está organizado usando el patrón de Vertical Slices (Features) para máxima cohesión:

```plaintext
/
├── src/
│   ├── app/                 # Enrutamiento Next.js (Rutas protegidas y públicas)
│   ├── features/            # Lógica de negocio (El corazón de la app)
│   │   ├── agenda/          # 📅 Calendario Realtime
│   │   ├── auth/            # 🔐 Autenticación y recuperación
│   │   ├── consultations/   # 🩺 Wizard Clínico y persistencia
│   │   ├── patients/        # 👥 Motor de pacientes y analíticas
│   │   └── ...
│   ├── components/ui/       # Sistema de diseño global (Botones, Modales)
│   └── lib/                 # Configuración core (IndexedDB, Supabase Client, Sync)
├── supabase/
│   └── migrations/          # Esquema SQL fuente de la verdad (RLS y Tablas)
├── docs/                    # Documentación arquitectónica
└── tests/                   # Suites de pruebas E2E y Unitarias
```

---

## 🚀 Guía de Inicio Rápido (Desarrollo)

### 1. Pre-requisitos
- Node.js v20+
- Cuenta en Supabase (Para BD local o remota)
- Cuenta en Stripe (Claves de prueba)

### 2. Instalación
Clona el repositorio e instala las dependencias:
```bash
git clone https://github.com/khryazid/hce.git
cd hce
npm install
```

### 3. Variables de Entorno
Copia el archivo de ejemplo y configura tus credenciales:
```bash
cp .env.example .env.local
```
*(Asegúrate de llenar `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, y claves de `STRIPE`).*

### 4. Ejecución del Servidor
Levanta el entorno de desarrollo (Next.js con Webpack, requerido para PWA):
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 🧪 Testing y QA

La calidad del código clínico es innegociable. Antes de cualquier Pull Request, debes asegurar:

```bash
# 1. Chequeo estricto de tipos
npm run typecheck

# 2. Análisis estático de código
npm run lint

# 3. Pruebas unitarias de lógica (Vitest)
npm run test

# 4. Pruebas End-to-End simulando al usuario (Playwright)
npm run test:e2e
```

---

## 🤝 Guía de Contribución

Nos adherimos a un estándar estricto para mantener la cordura del código:
- **Ramas:** Usamos el patrón `feature/nombre-corto`, `fix/problema` o `refactor/modulo`.
- **Commits:** Usa Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- **Pull Requests:** Todo PR requiere pasar las GitHub Actions (Lint, Typecheck, Tests) y al menos 1 aprobación (Review) antes de hacer merge a `develop`.
- **Registro de Cambios:** Todo cambio estructural debe ser registrado en el `AUDIT_LOG.md` interno del equipo.

---

## 📚 Documentación Extendida

Para bucear en las partes más complejas del sistema, revisa nuestros manuales en la carpeta `/docs`:
- [Arquitectura Offline-First](./docs/ARCHITECTURE.md)
- [Esquema de Base de Datos y RLS](./docs/DATABASE.md)
- [Estado y Caché Interactiva](./docs/STATE_MANAGEMENT.md)
- [Referencia de API (Stripe/IA)](./docs/API_REFERENCE.md)
