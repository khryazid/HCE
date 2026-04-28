# Tasklist canónico de mejora

Este es el único tasklist activo del proyecto. Resume lo que está en progreso y archiva el historial de lo ya completado.

## Fase Actual: Auditoría de Código y Deuda Técnica [28 de Abril de 2026]

- [x] **[CRÍTICO] Sincronización Offline-First y Rendimiento:** Reemplazar el `getAll("clinical_records")` iterativo por cursores o índices IndexedDB (`getAllFromIndex`) durante la resolución de conflictos (Merge de pacientes). El escaneo en memoria puede causar bloqueos y Out-Of-Memory en dispositivos móviles con gran volumen de consultas. (Archivo: `lib/sync/sync-worker.ts`)
- [x] **[CRÍTICO] Crash por OOM en PDF (Robustez y Edge Cases):** Implementar compresión previa de las imágenes (`logo_data_url` y `signature_data_url`) utilizando Canvas API (reducción de dimensiones y calidad a JPEG/WebP) en el momento en que se suben, ANTES de persistirlas o inyectarlas en jsPDF. (Archivo: Módulo de Ajustes/Perfil y `lib/consultations/pdf.ts`)
- [x] **[ALTO] Arquitectura React 19 y Clean Code:** Eliminar los anti-patrones de estado en efectos (`Promise.resolve().then(...)` para evitar re-renders sincrónicos) que causan cascadas de renderizado. Migrar a `useTransition`, derivación de estado puro o Handlers nativos. (Archivo: `lib/consultations/use-wizard-cie-suggestions.ts`)
- [x] **[MEDIO] Seguridad y Disponibilidad (Circuit Breaker):** Reforzar validación de la `GEMINI_API_KEY` e implementar límite de tasa (circuit breaker) local cuando ocurren fallos repetitivos hacia Gemini. Previene latencia acumulada y cuotas excedidas durante el fallback. (Archivo: `app/api/cie-suggestions/route.ts`)
- [x] **[DEUDA TÉCNICA] Tipados Inseguros en Base de Datos:** Eliminar el casteo inseguro `supabase.from(tableName as never) as unknown as TableSyncClient` en la sincronización construyendo un Type Guard exhaustivo usando los tipos generados `Database['public']['Tables']`. (Archivo: `lib/sync/sync-worker.ts`)
- [x] **[DEUDA TÉCNICA] Limpieza de Código Muerto:** Eliminar la asignación inútil `void candidateEntries;` en `app/api/cie-suggestions/route.ts` y auditar las llamadas flotantes (ej. `void flushSyncQueue();`) añadiendo manejo de errores adecuado a nivel global.

## Correcciones Pre-Producción
- [x] **[C-1]** Eliminar estado mutable (`consecutiveGeminiFailures`, `circuitBreakerResetTime`) en el Route Handler de Gemini para evitar inconsistencias en despliegues multi-instancia. (Archivo: `app/api/cie-suggestions/route.ts`)
- [x] **[C-2]** Añadir header `Retry-After: 60` en respuestas 429 de la API para que el fallback del cliente pueda procesarlo adecuadamente. (Archivo: `app/api/cie-suggestions/route.ts`)
- [x] **[C-3]** Exportar y llamar a `deleteSpecialtyDataLocal` al eliminar `clinical_records` para evitar datos PHI huérfanos en IndexedDB. (Archivo: `lib/db/indexeddb.ts`)
- [x] **[A-1]** Limpiar `useEffect` importado pero no utilizado en `lib/consultations/use-consultation-wizard.ts`.
- [x] **[A-3]** Eliminar y refactorizar castings inseguros (`as never`, `as unknown`) en `lib/supabase/profile.ts`, `lib/ai/cie-rate-limit.ts` y `lib/supabase/onboarding.ts`.

## Optimizaciones y Tareas Menores (Pre-Producción)
- [x] **[M-1 a M-6]** Eliminación de código muerto en loggers (`error-logger.ts`), eventos (`app-events.ts`), tipos/funciones huérfanas (`types/*`, `workflow.ts`) y componentes UI (`sync-queue-panel.tsx`, `empty-state.tsx`).
- [x] **[B-2]** Guardas de entorno (`NODE_ENV === "production"`) para métodos destructivos en IndexedDB (`clearOfflineDataForTests`).
- [x] **[B-3]** Mejora de entropía con `crypto.getRandomValues` como fallback de alta seguridad para la llave envolvente IDB.
- [x] **[B-4/B-5]** Removidas funciones no usadas de prod (`findLatestPatientRecord`) e indentación HTML en `layout.tsx`.
- [x] **[B-7]** Adición de instrucciones `pg_cron` en esquema SQL para las vistas materializadas.
- [x] **[B-10]** Añadidas cabeceras HTTP de seguridad estandar (`X-Content-Type-Options`, `X-Frame-Options`, `HSTS`) en `next.config.ts`.

## Tareas Generadas por Auditoría Continua (Pendientes de Revisión)
- [x] **[AUDITORÍA]** Analizar dependencias en `package.json` en busca de paquetes obsoletos o innecesarios.
- [x] **[AUDITORÍA]** Escanear la base de código para identificar código muerto, archivos huérfanos o variables sin uso.
- [x] **[AUDITORÍA]** Revisar la implementación del cifrado de PHI en IndexedDB y endpoints para garantizar cero fugas de datos.

## Plan de Remediación (Deuda Técnica y Seguridad)
- [x] **[ALTA PRIORIDAD - SEGURIDAD]** Envolver la clave AES de IndexedDB (`lib/db/crypto.ts`) con una clave AES-KW (WebCrypto `wrapKey`) derivada del dispositivo (`localStorage` PBKDF2). Mitigado el riesgo de material crudo Base64 extraíble.
- [x] **[MEDIA PRIORIDAD - LIMPIEZA]** Eliminar dependencias innecesarias en `package.json` (`workbox-window`, `eslint-plugin-jsx-a11y` - redundante con Next.js).
- [x] **[MEDIA PRIORIDAD - LIMPIEZA]** Eliminar los 9 archivos de lógica y UI huérfanos detectados (`wizard-step-confirm.tsx`, `odontogram.tsx`, `growth-curve.tsx`, `modal.tsx`, `tenant.ts`, `conflict-strategy.ts`, etc).
- [x] **[MEDIA PRIORIDAD - LIMPIEZA]** Purgar las 17 funciones/constantes exportadas y 33 tipos que no tienen uso en toda la aplicación (se retiraron los `export` para reducir el Scope y favorecer el Tree-Shaking).

---

## Historial de Tareas Completadas

<details>
<summary><strong>Ver todas las tareas completadas (150+ ítems)</strong></summary>

### 1. Infraestructura, PWA y Base de Datos
- [x] Inicializar Next.js 16 App Router + Tailwind.
- [x] Configurar PWA con `next-pwa` y fallback offline.
- [x] Crear estructura de carpetas por dominio (app, components, lib, types, public).
- [x] Implementar capa IndexedDB con stores espejo + `sync_queue`.
- [x] Implementar cliente Supabase y utilidades de tenant.
- [x] Agregar SQL inicial con tablas, RLS y `audit_logs` append-only.
- [x] Implementar worker de sincronizacion que se activa en evento `online`.
- [x] Añadir cifrado de PHI en IndexedDB con WebCrypto AES-GCM.
- [x] Definir pipeline CI para lint, typecheck y build.
- [x] Incorporar `husky` + `lint-staged` para pre-commit.
- [x] Activar reglas básicas de accesibilidad con `eslint-plugin-jsx-a11y`.
- [x] Implementar panel visual de `sync_queue` con reintento y descarte.
- [x] Consolidar el esquema SQL de Supabase en un unico archivo de despliegue a produccion.
- [x] Dejar en verde pipeline local.
- [x] Mecanismo de backup de clave de cifrado.
- [x] Corregir typecheck de WebCrypto.

### 2. Autenticación y Sistema Multi-Tenant
- [x] Crear rutas base de auth/dashboard y vistas dinamicas de especialidades.
- [x] Integrar autenticacion real Supabase en UI de login.
- [x] Implementar registro completo (nombre, especialidad, clinic_id) y bootstrap de perfil tenant.
- [x] Integrar catalogo oficial de especialidades medicas en el registro.
- [x] Conectar el tenant autenticado al dashboard real.
- [x] Cargar perfil de doctor y clinic_id desde Supabase.
- [x] Separar claramente flujo de login vs registro en la interfaz.
- [x] Multi-usuario por clinica.
- [x] Seccion `Ajustes` para membrete del medico.

### 3. Consultas Clínicas, Pacientes y Evolución
- [x] Crear CRUD funcional de pacientes con persistencia local y sync.
- [x] Crear CRUD de consultas con `clinical_records` y `specialty_data`.
- [x] Boton `Nueva consulta` con flujo guiado por pasos.
- [x] Paso 1: seleccionar paciente existente o crear paciente rapido desde la misma consulta.
- [x] Paso 2: registrar anamnesis, sintomas, diagnostico y codigos CIE.
- [x] Paso 3: seleccionar tratamiento predeterminado o editar tratamiento manual.
- [x] Paso 4: confirmar, guardar consulta y generar salida documental.
- [x] CRUD de plantillas de tratamiento gestionado por cada medico.
- [x] Timeline clinico por paciente y seguimientos sucesivos.
- [x] Estado del paciente: activo, inactivo, en seguimiento, alta.

### 4. Inteligencia Artificial (CIE Asistido) y Documentos (PDF)
- [x] Definir catalogo CIE local en IndexedDB.
- [x] Implementar sugerencias CIE asistidas por Gemini con fallback local.
- [x] Se extrajo la consulta CIE asistida del wizard a un helper reutilizable.
- [x] Se reordenó la API CIE para autenticar primero, limitar por usuario y exponer fallos del proveedor.
- [x] Crear generador PDF de consulta listo para impresion.
- [x] Aplicar membrete configurable en todos los PDFs generados.
- [x] Preview de PDF antes de generar.

### 5. Estabilización, Refactoring y Pruebas
- [x] Descomponer `consultas/page.tsx` de 1020 lineas a ~120 lineas.
- [x] Extraer `useConsultationWizard` hook con toda la logica del wizard.
- [x] Añadir cobertura de pruebas unitarias y E2E (91/91 tests).
- [x] Se endureció la cola de sincronización con backoff persistente y reintento forzado manual.
- [x] Reforzar la custodia de la clave PHI en `lib/db/crypto.ts` (threat model, caché).
- [x] Cerrar brecha RLS por tenant en `clinical_records` y `specialty_data`.
- [x] Unificar componentes reutilizables en `components/ui`.
- [x] Consistencia visual, dark mode, accesibilidad (WAI-ARIA).
- [x] Implementar observabilidad básica para errores de sync y de API (`error-logger.ts`).
- [x] Limpieza de código muerto, rutas y componentes sin valor operativo.

</details>
