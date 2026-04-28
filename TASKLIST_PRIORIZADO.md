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

## Pendiente priorizado

> **Última revisión:** 27 de abril de 2026 — Diagnóstico completo post-auditoría incorporado.

### Alta

#### Seguridad y riesgo operativo

- [x] **[NF-01]** Agregar guardia `navigator.onLine` en `fetchCieSuggestionsFromApi` antes del fetch a la API CIE — evita `TypeError: Failed to fetch` en modo offline. ([lib/consultations/cie-suggestions-client.ts](lib/consultations/cie-suggestions-client.ts))
- [x] **[NF-02]** Reemplazar el `catch (e) {}` vacío en `triggerMagicCieFill` con log estructurado — errores de auth, red y rate-limit son actualmente invisibles. ([lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts))
- [x] **[NF-03]** Mover archivos SQL de migración legacy (`001`–`004`) a `lib/supabase/archive/` con header de obsolescencia para evitar ejecución accidental en producción sobre políticas RLS inseguras.
- [x] Confirmar qué archivo SQL fue efectivamente ejecutado en el Supabase de producción (`001` vs `000`) — se confirma `000`. Las políticas RLS de `patients` incluyen `clinic_id` via join a `profiles`.
- [x] **[RLS]** Cerrar la brecha RLS por tenant en `000_production_full_schema.sql` para `clinical_records` y `specialty_data` — ambas tablas ahora validan `clinic_id` via join a `profiles`, igual que `patients`.
- [x] Reforzar la custodia de la clave PHI en [lib/db/crypto.ts](lib/db/crypto.ts): threat model documentado, caché en memoria con `extractable: false`, `clearEncryptionKey()` integrado en logout para prevenir retención cross-session.
- [x] Investigar y corregir el `TypeError: Failed to fetch` al actualizar datos de usuario sin conexión. (guardia `navigator.onLine` en `saveOnboardingProfile` con mensaje accionable)

#### Limpieza de código y archivos

- [x] **[NF-06]** Eliminar `refactor.js` de la raíz — script de migración de tokens CSS ya ejecutado y sin uso futuro.
- [x] **[NF-10/NF-12]** Eliminar `TASKLIST.md`, `TASKLIST_UI.md` y `CLAUDE.md` (punteros vacíos/archivos mínimos sin valor).
- [x] **[NF-11]** Agregar `playwright-report/` al `.gitignore` — artefactos de CI no deben ir en el repositorio.
- [x] **[NF-09]** Eliminar variable `contextEntries` no utilizada en `app/api/cie-suggestions/route.ts` y comentario de código muerto en el wizard.
- [x] **[NF-09]** Los archivos SQL `001`–`004` están en `lib/supabase/archive/` con header de obsolescencia. Tasklist cerrado.

#### Refactoring y robustez

- [x] Extraer `saveConsultation` del wizard a un hook dedicado `useConsultationSave` — es la función más larga (80+ líneas) que aún orquestaba PDF, persistencia, re-fetch y evento. ([lib/consultations/use-consultation-save.ts](lib/consultations/use-consultation-save.ts))
- [x] Agregar acción de reintento manual para ítems `abandoned` en el panel de sync — botón "Reintentar" por ítem, badge de estado visual, re-clasifica a `pending` y fuerza flush. ([components/ui/sync-queue-panel.tsx](components/ui/sync-queue-panel.tsx))
- [x] **[NF-05]** Corregir `toLocaleString()` sin locale en [components/ui/sync-queue-panel.tsx](components/ui/sync-queue-panel.tsx) — usar `"es-EC"` consistente con el resto de la app.
- [x] Crear utilidad centralizada `lib/ui/format-date.ts` con `formatDateEs()` para unificar el formato `dd/mm/aaaa` en toda la app y eliminar `toLocaleString` dispersos.
- [x] Cambiar el formato de fecha de `mm/dd/aaaa` a `dd/mm/aaaa` en toda la app (migrado a `lib/ui/format-date.ts`).
- [x] Revisar la estructura de [components/ui](components/ui) para consolidar patrones reutilizables y evitar estilos aislados por pantalla.
- [x] Hacer revisión formal de teclado, foco visible, contraste y jerarquía visual en auth, dashboard, consultas, pacientes y ajustes.
- [x] Validar la experiencia móvil en listas largas, wizard clínico y panel de sincronización.
- [x] Corregir errores de color en login y registro para que no haya textos claros sobre fondos claros o ilegibles, sin refactorizar la pantalla.
- [x] Descomponer [app/(dashboard)/pacientes/page.tsx](app/(dashboard)/pacientes/page.tsx) en Container + componentes presentacionales para lista, perfil, historial y modales.
- [x] Endurecer el borrado de paciente/consultas en [app/(dashboard)/pacientes/page.tsx](app/(dashboard)/pacientes/page.tsx) para evitar operaciones secuenciales largas sin feedback por item.
- [x] Descomponer [app/(dashboard)/dashboard/page.tsx](app/(dashboard)/dashboard/page.tsx) separando métricas, seguimientos, actividad y gráficos en módulos reutilizables. (584 líneas → ~250 container + 4 componentes en `components/dashboard/`)
- [x] Seguir descomponiendo [lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts) extrayendo acciones de guardado y transiciones de modo a hooks dedicados. (`useConsultationPdfPreview`, `useQuickPatientCreate`, `useConsultationSave`)
- [x] Optimizar el merge de pacientes duplicados en [lib/sync/sync-worker.ts](lib/sync/sync-worker.ts) para evitar recorridos completos de `sync_queue` y `clinical_records` en cada conflicto. **[NF-04]**
- [x] Descomponer [components/ui/professional-profile-form.tsx](components/ui/professional-profile-form.tsx) en secciones claras para perfil, logo/firma y backup de clave. (`ProfileSectionPersonal`, `ProfileSectionLetterhead`, `ProfileSectionKeyBackup` — Paso 9)
- [x] Unificar patrones visuales entre [components/ui/auth-form.tsx](components/ui/auth-form.tsx) y el resto de la UI: `hce-alert-error/success`, `aria-busy` en submit, `role=alert` en errores de campo.
- [x] Mejorar la semántica y accesibilidad de la selección de especialidades en [components/ui/auth-form.tsx](components/ui/auth-form.tsx): `fieldset/legend`, `role=listbox/option`, `aria-selected`, `aria-describedby` en errores, `focus-visible:ring-2` en pills.
- [x] Corregir el mapeo de especialidad canónica del registro de médicos: eliminado el campo `specialty` (singular) redundante del metadata de signUp, dejando `specialties[]` como fuente de verdad.
- [x] Corregir el espaciado en los PDFs generados y superposición de Signos Vitales: vitales divididos en 2 filas (3+2), `drawSectionHeader` con espaciado uniforme.

### Media

- [x] Formalizar observabilidad básica para errores de sync y de API. (Paso 4: `error-logger.ts`, `use-error-log.ts`, `ErrorLogPanel`)
- [x] Agregar pruebas para dashboard con cálculos unitarios e integraciones de interacciones clave. (17 tests en `tests/dashboard-metrics.test.ts` cubriendo `calculateAge`, `getLast7DaysConsultations`, `getSpecialtyBreakdown`, `calculateMetrics`, `buildActivityFeed`)
- [x] Crear pruebas de regresión para el wizard: `validateWizardForm` (10 casos), `buildQuickPatientRecord` (4), `buildFollowUpFormState` (4), `buildConsultaModeFormState` (1), `buildConsultationPayload` (10), `buildConsultationSuccessMessage` (4). Total: 34 nuevos tests.
- [x] Mejorar la experiencia de rate limiting CIE: `CieRateLimitError` tipado (lee `Retry-After`), countdown en segundos en el hook con `setInterval`, se inhibe el disparo durante el cooldown. `rateLimitCountdown` expuesto para la UI.
- [x] Unificar componentes reutilizables en [components/ui](components/ui) para evitar estilos aislados por pantalla.
- [x] Convertir el wizard de consultas en un conjunto de hooks pequeños y componentes presentacionales. (Pasos 2 y 5 completos: 7 hooks dedicados extraidos)
- [x] Validar de forma explícita los estados vacíos, de carga y de error en cada flujo principal: `EmptyState` + `ErrorState` centralizados en `components/ui/empty-state.tsx`; integrados en `PatientList`, `PatientProfileCard`, `PatientHistoryTimeline`, `ConsultasPage` (estado idle con CTA).
- [x] Accesibilidad en pacientes: `aria-label` en busqueda, `role=list/listitem`, `aria-current` en paciente seleccionado, `focus-visible:ring-2` en todos los botones de acción críticos.
- [x] Revisar el sistema de PDF y overlays para estandarizar z-index: escala CSS `--z-sticky/overlay/modal` en `globals.css`. `ConfirmModal` usa `hce-modal-backdrop`; wizard usa `hce-sticky-action-bar`. `<dialog>` nativo + scroll-lock en modal. `aria-live=assertive` en descripcion.
- [x] Añadir una vista de recuperación para elementos `abandoned` de la cola de sincronización. (Paso 2: botón "Reintentar" por ítem, `handleRetryAbandoned`)

### Baja

- [x] Reducir la lógica de polling residual en paneles de estado cuando no aporte valor operativo.
- [x] Hacer una limpieza de rutas y páginas de soporte que no aporten valor operativo.
- [x] Preparar una segunda pasada de UX centrada solo en claridad clínica y velocidad de uso.
- [x] Reforzar controles que dependan demasiado del color para comunicar estado.
- [x] Añadir métricas ligeras de uso para priorizar futuras mejoras de UI y flujo clínico.

## Siguientes pasos recomendados

1. **[HECHO - Paso 1]** Contención de riesgo: guardia offline CIE, log de errores en triggerMagicCieFill, archivos SQL archivados, limpieza de basura.
2. **[HECHO - Paso 2]** Extraer `saveConsultation` a `useConsultationSave` + reintento de `abandoned` en sync + corregir locale de fechas.
3. **[HECHO - Paso 3]** Descomponer `pacientes/page.tsx` en 4 componentes + crear `lib/ui/format-date.ts` central + endurecer borrado con feedback granular por item.
4. **[HECHO - Paso 4]** Observabilidad: `error-logger.ts` (ring-buffer en sessionStorage), `use-error-log.ts`, `ErrorLogPanel` con indicador pulsante y badge de severidad. Integrado en sync-worker, CIE client y dashboard de ajustes.
5. **[HECHO - Paso 5]** Wizard: extraer `useConsultationPdfPreview` y `useQuickPatientCreate`; eliminar código muerto; `console.warn` → `logApiError`; NF-04 merge O(n)→ filtrado dirigido.
6. **[HECHO - Paso 6 / Auditoría]** Brecha RLS cerrada en `clinical_records` y `specialty_data` (clinic_id + doctor_id). Dashboard descompuesto en 4 componentes + tipos centralizados. 0 `toLocaleString` dispersos. 0 `console.` en lib/.
7. **[HECHO - Paso 7]** Fix offline en perfil (`TypeError: Failed to fetch`). Dashboard helpers extraidos a `lib/dashboard/metrics.ts` (testeable). 17 nuevos tests de dashboard. PDF vitals reestructurado en 2 filas sin overflow. Total: **57/57 tests**.
8. **[HECHO - Paso 8]** PHI key custody: threat model documentado, caché en memoria, `clearEncryptionKey()` en logout. 34 nuevos tests de regresión del wizard (domain + payload). Total: **91/91 tests · 15 archivos**.
9. **[HECHO - Paso 9]** CIE rate limiting: `CieRateLimitError` + countdown en hook. `professional-profile-form.tsx` descompuesto en 3 secciones (`ProfileSectionPersonal`, `ProfileSectionLetterhead`, `ProfileSectionKeyBackup`). Bug de especialidad canónica cerrado en `auth-form.tsx`. Total: **91/91 tests**.
10. **[HECHO - Paso 10]** `EmptyState`/`ErrorState` centralizados (5 iconos SVG, 3 tamaños, CTA). Integrados en `PatientList`, `PatientProfileCard`, `PatientHistoryTimeline`, `ConsultasPage`. Accesibilidad: `role=list`, `aria-current`, `aria-label`, `focus-visible:ring-2` en todos los botones de acción. Total: **91/91 tests**.
11. **[HECHO - Paso 11]** Z-index centralizado en variables CSS (`--z-sticky/overlay/modal`). `ConfirmModal` migrado a `hce-modal-backdrop` + `dialog` nativo + scroll-lock. `SyncQueuePanel` con `role=status aria-live=polite aria-busy`. Skeletons con `role=status aria-busy=true`. Auth form unificada con tokens `hce-alert-*`, `fieldset/legend` en especialidades, `role=listbox/option`, `aria-invalid/describedby`. Total: **91/91 tests**.

### Ítems pendientes (siguiente ciclo)
- Limpieza de rutas y páginas de soporte sin valor operativo. (HECHO)
- Métricas ligeras de uso para priorizar mejoras futuras de UI. (HECHO)
- Segunda pasada de UX: claridad clínica y velocidad de uso. (HECHO)
- Reforzar controles que dependan del color para comunicar estado. (HECHO)
