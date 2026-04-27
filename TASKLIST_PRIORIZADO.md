# Tasklist canónico de mejora

Este es el único tasklist activo del proyecto. Resume lo ya completado y lo que sigue pendiente, sin duplicar el contenido de [TASKLIST.md](TASKLIST.md) ni [TASKLIST_UI.md](TASKLIST_UI.md).

## Hecho

- [x] Inicializar Next.js 16 App Router + Tailwind.
- [x] Configurar PWA con `next-pwa` y fallback offline.
- [x] Crear estructura de carpetas por dominio (app, components, lib, types, public).
- [x] Implementar capa IndexedDB con stores espejo + `sync_queue`.
- [x] Implementar cliente Supabase y utilidades de tenant.
- [x] Agregar SQL inicial con tablas, RLS y `audit_logs` append-only.
- [x] Implementar worker de sincronizacion que se activa en evento `online`.
- [x] Crear rutas base de auth/dashboard y vistas dinamicas de especialidades.
- [x] Integrar autenticacion real Supabase en UI de login.
- [x] Implementar registro completo (nombre, especialidad, clinic_id) y bootstrap de perfil tenant.
- [x] Integrar catalogo oficial de especialidades medicas en el registro.
- [x] Añadir cifrado de PHI en IndexedDB con WebCrypto AES-GCM.
- [x] Añadir pruebas unitarias de cola de sincronizacion.
- [x] Definir pipeline CI para lint, typecheck y build.
- [x] Añadir workflow CI con lint, typecheck y tests E2E opcionales.
- [x] Incorporar `husky` + `lint-staged` para pre-commit.
- [x] Activar reglas básicas de accesibilidad con `eslint-plugin-jsx-a11y`.
- [x] Implementar panel visual de `sync_queue` con reintento y descarte.
- [x] Conectar el tenant autenticado al dashboard real.
- [x] Cargar perfil de doctor y clinic_id desde Supabase.
- [x] Crear CRUD funcional de pacientes con persistencia local y sync.
- [x] Crear CRUD de consultas con `clinical_records` y `specialty_data`.
- [x] Añadir cifrado local de PHI en IndexedDB.
- [x] Crear pruebas de sync y conflicto.
- [x] Rediseñar pantalla de acceso con branding claro.
- [x] Separar claramente flujo de login vs registro en la interfaz.
- [x] Registro de medico con soporte de multiples especialidades.
- [x] Crear onboarding inicial de medico.
- [x] Crear dashboard principal con KPIs clinicos.
- [x] Añadir modulo de actividad reciente.
- [x] Añadir alertas operativas.
- [x] Boton `Nueva consulta` con flujo guiado por pasos.
- [x] Paso 1: seleccionar paciente existente o crear paciente rapido desde la misma consulta.
- [x] Paso 2: registrar anamnesis, sintomas, diagnostico y codigos CIE.
- [x] Paso 3: seleccionar tratamiento predeterminado o editar tratamiento manual.
- [x] Paso 4: confirmar, guardar consulta y generar salida documental.
- [x] Crear modulo `Tratamientos` gestionado por cada medico.
- [x] CRUD de plantillas de tratamiento.
- [x] Permitir versionado/edicion de plantillas sin perder historial.
- [x] Permitir aplicar plantilla en consulta y luego modificarla.
- [x] Crear estado de evolucion opcional por consulta.
- [x] Permitir registrar controles sucesivos de seguimiento por paciente.
- [x] Timeline clinico por paciente.
- [x] Convertir la vista de pacientes en historial clinico navegable.
- [x] Quitar alta, edicion y eliminacion de pacientes desde este modulo.
- [x] Mostrar seguimientos y consultas clicables por paciente.
- [x] Crear generador PDF de consulta listo para impresion.
- [x] Seccion `Ajustes` para membrete del medico.
- [x] Configurar hasta 2 numeros de contacto y correo electronico en membrete.
- [x] Aplicar membrete configurable en todos los PDFs generados.
- [x] Pruebas unitarias de flujo de consulta.
- [x] Pruebas de integracion para plantillas de tratamiento por tenant.
- [x] Validar exportacion PDF en desktop y mobile.
- [x] Añadir tabla `follow_up_tasks` para pendientes clinicos.
- [x] Crear vista materializada diaria para KPIs del dashboard.
- [x] Definir catalogo CIE local en IndexedDB.
- [x] Registrar eventos de onboarding y ajuste de perfil en `audit_logs`.
- [x] Diseñar estrategia de resolucion de conflictos por campo.
- [x] Implementar sugerencias CIE asistidas por Gemini con fallback local.
- [x] Añadir modo Seguimiento en Consultas.
- [x] Añadir acceso directo desde historial de pacientes para abrir seguimiento precargado.
- [x] Consolidar el esquema SQL de Supabase en un unico archivo de despliegue a produccion.
- [x] Añadir logo local en Ajustes para incluirlo en PDF sin almacenar en Supabase.
- [x] Descomponer `consultas/page.tsx` de 1020 lineas a ~120 lineas.
- [x] Extraer `useConsultationWizard` hook con toda la logica del wizard.
- [x] Crear componentes por paso del wizard.
- [x] Crear `wizard-navigation` y `patient-timeline` como componentes independientes.
- [x] Crear `TenantContext` para eliminar bootstrap duplicado.
- [x] Simplificar `dashboard/page.tsx` y `pacientes/page.tsx` con `useTenant()`.
- [x] Rediseñar layout y navegacion.
- [x] Persistencia de estado al navegar.
- [x] Interaccion al cerrar sesion con modal de confirmacion.
- [x] Loading states profesionales.
- [x] Permitir borrar pacientes y consultas con confirmacion.
- [x] Generar PDF de consulta despues de haberla realizado.
- [x] Crear consulta con nombre y apellido separados.
- [x] Validaciones inline en el wizard de consultas.
- [x] Estado del paciente: activo, inactivo, en seguimiento, alta.
- [x] Permitir modificar el estado del paciente desde su perfil.
- [x] Historial de seguimientos visible por paciente.
- [x] Panel de seguimientos pendientes en dashboard.
- [x] Mejorar historial de pacientes.
- [x] Busqueda global accesible desde cualquier pantalla.
- [x] Visualizacion de datos en dashboard con mini-graficos.
- [x] Preview de PDF antes de generar.
- [x] Dashboard mas amigable.
- [x] Quitar "Especialidades" del nav.
- [x] Convertir "Perfil" (/onboarding) en pagina de perfil editable.
- [x] Unificar "Perfil" y "Ajustes".
- [x] Multi-usuario por clinica.
- [x] Implementar componentes clinicos reales.
- [x] Mecanismo de backup de clave de cifrado.
- [x] Tests E2E con Playwright.
- [x] Soporte dark mode.
- [x] Corregir typecheck de WebCrypto.
- [x] Alinear modelo de estado de paciente entre UI, sync worker y Supabase.
- [x] Agregar columna `status` en `patients`.
- [x] Incluir `status` en payload de sincronizacion.
- [x] Corregir error de lint `react/no-unescaped-entities`.
- [x] Dejar en verde pipeline local.
- [x] Evaluar y configurar `allowedDevOrigins`.
- [x] Agregar test de sync que verifique persistencia de `patient.status`.
- [x] Revisar consistencia visual de toda la app.
- [x] Responsive y accesibilidad: contraste, foco visible, legibilidad.
- [x] Tipografia y espaciado uniforme.
- [x] Mejoras de Login y Registro.
- [x] Mejoras del Layout de Dashboard.
- [x] Mejoras del flujo de Consultas.
- [x] Mejoras de pantalla de Pacientes.
- [x] Mejoras de Ajustes.
- [x] Consistencia de botones, inputs, estados vacios, alerts y modales.
- [x] Responsive y accesibilidad visual.
- [x] Corregir texto con comillas sin escapar en panel de sync.
- [x] Corregir `ReferenceError` de `useCallback` en la vista de pacientes.
- [x] Corregir `autoFocus` en la búsqueda global con focus programático.
- [x] `/ajustes` quedó como pantalla canónica de perfil profesional y `/onboarding` pasó a alias de compatibilidad.
- [x] `/especialidades` quedó definido como sandbox clínico de validación de componentes reales.
- [x] Se endureció la cola de sincronización con backoff persistente y reintento forzado manual.
- [x] Se reordenó la API CIE para autenticar primero, limitar por usuario y exponer fallos del proveedor con estado observable.
- [x] Se agregó cobertura de pruebas para la ruta CIE: sin auth, rate limit y fallback 503 cuando Gemini no responde.
- [x] Se extrajo la consulta CIE asistida del wizard a un helper reutilizable para reducir complejidad del hook.
- [x] Se extrajeron cálculos puros de seguimiento a un helper compartido y se cubrieron con tests.
- [x] Se agregó cobertura de pruebas para sync fallido, merge de pacientes duplicados, auth CIE rechazada y credenciales Supabase ausentes.
- [x] Se añadió trazabilidad mínima para onboarding, guardado de consulta y flujo de sugerencias CIE.
- [x] Se aisló la construcción del preview de PDF en un helper puro con prueba unitaria.
- [x] Se extrajo la construcción del payload clínico y el mensaje de éxito del guardado de consulta a helpers puros.
- [x] Se unificaron los handlers de guardado con y sin PDF en un solo flujo interno del wizard.
- [x] Se aclararon mensajes genéricos de autenticación y guardado de consulta para volverlos más accionables.
- [x] Se separó el acceso en una landing clara y dos rutas dedicadas para login y registro.
- [x] Se movió el rate limiting de CIE a un RPC compartido en Supabase para que no dependa de memoria local.
- [x] Se documentó qué pantallas son núcleo del producto y cuáles son de soporte o demostración.
- [x] Se estandarizó el copy accionable de errores comunes en perfil, sync, pacientes y consultas.
- [x] Se extrajo la persistencia local y el encolado de sync de la consulta a un helper dedicado.
- [x] Se extrajo la transición de modo consulta/seguimiento a helpers puros reutilizables.
- [x] Se extrajo el flujo de submit con validación/errores del wizard a un helper testeable con cobertura unitaria.
- [x] Se movió el autocompletado CIE mágico a un cliente reutilizable para reducir lógica de red en el hook.
- [x] Se separó el sync en fallo temporal (`pending` con backoff) y registro abandonado (`abandoned`) como estado terminal.
- [x] Se ajustó el worker para evitar ciclos frecuentes en fallos persistentes y se actualizó UI/métricas para reflejar abandonados.
- [x] Se extrajo la precarga de seguimiento por deep-link del wizard a un helper puro con prueba unitaria.
- [x] Se extrajo el auto-fill histórico de paciente del wizard a helpers de dominio puros con pruebas unitarias.
- [x] Se extrajo la restauración/autoguardado del borrador del wizard a un custom hook dedicado.
- [x] Se extrajeron derivados de seguimiento/timeline del wizard (`pendingFollowUp`, filas de timeline y ordenamiento de registros) a helpers puros con pruebas.
- [x] Se extrajo la lógica de sugerencias CIE del wizard a un custom hook dedicado (`useWizardCieSuggestions`).
- [x] Se extrajo el manejo de deep-link de seguimiento del wizard a un custom hook dedicado (`useFollowUpDeepLink`).
- [x] Se extrajo el bootstrap de datos del wizard por tenant a un custom hook dedicado (`useConsultationBootstrapData`).

## Pendiente

- [x] Endurecer el worker de sincronización con backoff por item, reintentos controlados y separación clara entre fallo temporal y registro abandonado.
- [x] Revisar [lib/sync/sync-worker.ts](lib/sync/sync-worker.ts) para que los fallos persistentes no entren en ciclos de reintento demasiado frecuentes.
- [x] Separar `useConsultationWizard` en piezas menores para que la lógica de consulta sea testeable y mantenible.
- [x] Revisar el copy de estados de éxito y error para que sea más accionable y menos genérico.
- [x] Revisar la estructura de `components/ui` para seguir consolidando patrones reutilizables y evitar estilos aislados por pantalla.
- [x] Hacer una revisión formal de teclado, foco visible, contraste y jerarquía visual en auth, dashboard, consultas, pacientes y ajustes.
- [x] Validar la experiencia móvil en listas largas, wizard clínico y panel de sincronización.
- [x] Revisar si hay controles que dependen demasiado del color para comunicar estado.
- [x] Probar de forma explícita los estados vacíos, de carga y de error en cada flujo principal.

### Hallazgos de auditoria 2026-04-27

- [ ] Descomponer `app/(dashboard)/pacientes/page.tsx` (694 lineas) en Container + componentes presentacionales (lista, perfil, historial, modales) para reducir acoplamiento y facilitar pruebas.
- [x] Eliminar `eslint-disable react-hooks/exhaustive-deps` en `app/(dashboard)/pacientes/page.tsx` y reemplazarlo por dependencias estables con hooks/memos para evitar estados obsoletos.
- [x] Mejorar accesibilidad del historial expandible en `app/(dashboard)/pacientes/page.tsx` agregando `aria-expanded`, `aria-controls` e `id` de panel.
- [ ] Endurecer borrado de paciente/consultas en `app/(dashboard)/pacientes/page.tsx`: evitar operaciones secuenciales largas sin control de errores parcial, y agregar feedback por item fallido.
- [ ] Descomponer `app/(dashboard)/dashboard/page.tsx` (516 lineas) separando calculo de metricas, panel de seguimientos, actividad y graficos en modulos reutilizables.
- [ ] Agregar pruebas para dashboard y pacientes (unitarias de calculos + integracion de interacciones clave) para reducir regresiones en vistas core.
- [ ] Seguir descomponiendo `lib/consultations/use-consultation-wizard.ts` (566 lineas): extraer acciones de guardado y transiciones de modo a hooks dedicados para cerrar el refactor iniciado.
- [ ] Tipar mejor `lib/sync/sync-worker.ts` eliminando casts `as any` en errores y cliente Supabase, con type guards para errores Postgres/RPC.
- [ ] Optimizar flujo de merge de pacientes duplicados en `lib/sync/sync-worker.ts` para evitar recorridos completos de `sync_queue` y `clinical_records` en cada conflicto, con helper dedicado y pruebas de volumen.
- [ ] Descomponer `components/ui/professional-profile-form.tsx` (480 lineas) en secciones (perfil, logo/firma, backup de clave) y hooks de archivo/backup para aplicar SRP.
- [ ] Unificar patrones visuales entre `components/ui/auth-form.tsx` y el resto de UI (`hce-input`, `hce-btn-*`, alertas), evitando estilos aislados por pantalla.
- [ ] Mejorar semantica y a11y de seleccion de especialidades en `components/ui/auth-form.tsx` (chips con estado seleccionable accesible por teclado/lector).
- [x] Reducir polling fijo en `components/ui/sync-queue-panel.tsx` (cada 4s): combinar refresco por eventos de sync/online/visibility y fallback temporal para ahorrar recursos.

## Siguientes pasos recomendados

1. Convertir el wizard de consultas en un conjunto de hooks pequeños y componentes presentacionales.
2. Formalizar observabilidad básica para errores de sync y de API.
3. Hacer una limpieza de rutas y páginas de soporte que no aporten valor operativo.
4. Preparar una segunda pasada de UX centrada solo en claridad clínica y velocidad de uso.

### Plan de ejecución priorizado (rápido y accionable)

**Objetivo:** reducir riesgos inmediatos (datos, sync, accesibilidad) y preparar refactors grandes con cambios pequeños y verificables.

- **Quick wins (pequeño, 0.5-1 día cada uno)**
	- [ ] Eliminar `// eslint-disable-next-line react-hooks/exhaustive-deps` en `app/(dashboard)/pacientes/page.tsx` y arreglar dependencias de los hooks. (reduce bugs de estado)
	- [ ] Añadir `aria-expanded`, `aria-controls` y `id` a los elementos expandibles del historial en `app/(dashboard)/pacientes/page.tsx`. (mejora a11y)
	- [ ] Reducir polling en `components/ui/sync-queue-panel.tsx`: usar eventos `SYNC_FINISHED_EVENT`, `online` y `visibilitychange` con fallback de 30s. (ahorro CPU/batería)
	- [ ] Añadir foco visible y roles a botones claves en `components/ui/auth-form.tsx` y `components/ui/professional-profile-form.tsx`. (mejora a11y)

- **Medianos (2-4 días cada uno)**
	- [ ] Descomponer `components/ui/professional-profile-form.tsx` en `ProfileForm`, `LetterheadUploader` y `KeyBackupSection` con hooks `useFileReader` y `useKeyBackup`. (SRP + testable)
	- [ ] Añadir pruebas unitarias para `app/(dashboard)/dashboard/page.tsx` calculos de métricas y `app/(dashboard)/pacientes/page.tsx` filtros/selección. (reduce regresiones)
	- [ ] Tipar `lib/sync/sync-worker.ts` eliminando `as any`, agregar type guards para errores Postgres y pruebas unitarias que simulen `PATIENT_MERGE_REQUIRED`. (seguridad de sync)

- **Grandes (1-2+ semanas)**
	- [ ] Dividir `app/(dashboard)/pacientes/page.tsx` en Container + `PatientList`, `PatientProfile`, `PatientHistory` y `PatientActions`. Migrar estado a hooks pequeños y contexto si es necesario. (mantenibilidad)
	- [ ] Refactorizar `lib/consultations/use-consultation-wizard.ts` extrayendo `useWizardSave`, `useWizardAutofill`, `useWizardDraft` y componentes por paso. Añadir pruebas de integración del wizard. (reducción de complejidad)
	- [ ] Refactorizar `app/(dashboard)/dashboard/page.tsx` en componentes reutilizables (MetricsCard, FollowUpPanel, ActivityFeed, Charts) y mover cálculos a utilitarios puros con tests. (claridad + reutilización)

**Primer sprint recomendado (1 semana)**
- Día 1-2: Quick wins listados arriba (eslint, a11y, polling, foco).
- Día 3-5: Descomponer `professional-profile-form` y añadir tests básicos para sus helpers.

Si confirmas, comienzo con los "Quick wins" en este repo: aplicaré los cambios en pequeñas PRs y ejecutaré tests locales tras cada cambio.

## Análisis automatizado (Copilot) — 2026-04-27

Resumen rápido: la base del proyecto es sólida (Next.js 16 App Router, TypeScript, Tailwind, tests y PWA). Hay refactors ya iniciados; sugiero añadir tareas operativas y técnicas de bajo coste que reducen riesgo inmediato y preparan refactors mayores.

Tareas adicionales recomendadas (accionables):

- **CI/E2E:** Añadir job en CI para `npm run test:e2e` (headed/headed=false según secreto) y reportes Playwright; marcar como obligatorio en merges de `main`.
- **Pre-commit:** Instalar `husky` + `lint-staged` para ejecutar `npm run lint`, `npm run typecheck --noEmit` y tests rápidos antes de commit.
- **A11y automatizada:** Integrar `axe-core` o `playwright-axe` en la suite E2E y añadir job de accesibilidad que falle en violaciones graves.
- **Lint & reglas a11y:** Activar `eslint-plugin-jsx-a11y` y reglas clave (`interactive-supports-focus`, `no-autofocus`, `anchor-is-valid`) y corregir errores encontrados.
- **Dependabot / seguridad:** Activar Dependabot para actualizaciones de libs y un escaneo SCA (GitHub Dependabot alerts o similar).
- **TypeScript stricter:** Forzar `strict: true` en `tsconfig.json` y corregir los `any` más críticos (especialmente en `lib/sync` y WebCrypto wrappers).
- **Component library / Storybook:** Iniciar `Storybook` o catálogo visual mínimo para `components/ui` y cubrir átomos (Button, Input, Modal, Skeleton) para evitar estilos duplicados.
- **Design tokens:** Extraer variables de diseño (colores, espaciado, tipografías) a un archivo central (Tailwind config + tokens exportables) para consistencia visual.
- **Observabilidad:** Añadir hooks para logging de errores en sync (Sentry/LogRocket opcional) y métricas básicas para fallos de sync y errores de guardado de consulta.
- **Optimización assets:** Usar `next/image` donde aplique, y revisar `public/` para imágenes innecesarias; añadir `image-webpack-loader`/optimización en build si procede.
- **Polling -> eventos:** Reemplazar polling fijo por eventos (`sync`/`online`/`visibilitychange`) con fallback razonable (30s) en paneles que consumen CPU.
- **PR template & checklist:** Añadir plantilla de PR que requiera `lint`, `typecheck`, tests, y verificación de accesibilidad mínima.

Prioridad sugerida: CI/E2E, Pre-commit, A11y automatizada y TypeScript stricter (alta); Storybook, Design tokens, Observabilidad (media); Optimización assets y Dependabot (baja-mediana).

Si quieres, empiezo aplicando el primer bloque (CI + pre-commit + reglas a11y) en una PR pequeña.
