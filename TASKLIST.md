# TASKLIST

## Iteracion 1 - Base Plataforma

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
- [x] Integrar catálogo oficial de especialidades médicas en el registro.
- [x] Añadir cifrado de PHI en IndexedDB con WebCrypto AES-GCM.
- [x] Añadir pruebas unitarias de cola de sincronizacion.
- [x] Definir pipeline CI para lint, typecheck y build.
- [x] Implementar panel visual de `sync_queue` con reintento y descarte.

## Tareas para ti

- [x] Crear `.env.local` a partir de `.env.example`.
- [x] Pegar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] Ejecutar el SQL de [lib/supabase/001_init_schema.sql](lib/supabase/001_init_schema.sql) en Supabase.
- [x] Crear el proyecto y las credenciales reales de Supabase Auth.
- [x] Revisar que el tenant inicial use `doctor_id` y `clinic_id` correctos.
- [x] Confirmar si quieres que el siguiente paso sea autenticacion real o cifrado local PHI.

## Siguiente fase recomendada

- [x] Conectar el tenant autenticado al dashboard real.
- [x] Cargar perfil de doctor y clinic_id desde Supabase.
- [x] Crear CRUD funcional de pacientes con persistencia local y sync.
- [x] Crear CRUD de consultas con `clinical_records` y `specialty_data`.
- [x] Añadir cifrado local de PHI en IndexedDB.
- [x] Crear pruebas de sync y conflicto.

## Iteracion 2 - Flujo Clinico y UX Producto

- [x] Rediseñar pantalla de acceso con branding claro (nombre app + propuesta de valor).
- [x] Separar claramente flujo de login vs registro en la interfaz.
- [x] Registro de medico con soporte de multiples especialidades.
- [x] Crear onboarding inicial de medico (completar datos obligatorios de perfil profesional).

## Dashboard y Analitica

- [x] Crear dashboard principal con KPIs clinicos: pacientes activos, consultas del dia, consultas por especialidad, pendientes de seguimiento.
- [x] Añadir modulo de actividad reciente: ultimas consultas y ultimas actualizaciones de pacientes.
- [x] Añadir alertas operativas: items en conflicto de sync, seguimientos vencidos y registros incompletos.

## Flujo de Consulta

- [x] Boton `Nueva consulta` con flujo guiado por pasos.
- [x] Paso 1: seleccionar paciente existente o crear paciente rapido desde la misma consulta.
- [x] Paso 2: registrar anamnesis, sintomas, diagnostico y codigos CIE.
- [x] Paso 3: seleccionar tratamiento predeterminado o editar tratamiento manual.
- [x] Paso 4: confirmar, guardar consulta y generar salida documental.

## Tratamientos Predeterminados por Medico

- [x] Crear modulo `Tratamientos` gestionado por cada medico (multi-tenant aislado).
- [x] CRUD de plantillas: enfermedad/sintoma -> tratamiento recomendado.
- [x] Permitir versionado/edicion de plantillas sin perder historial de cambios.
- [x] Permitir aplicar plantilla en consulta y luego modificarla para un caso especifico.

## Evolucion y Seguimiento

- [x] Crear estado de evolucion opcional por consulta.
- [x] Permitir registrar controles sucesivos de seguimiento por paciente.
- [x] Timeline clinico por paciente con consultas, tratamientos y evolucion en orden cronologico.

## Pacientes como Historial Clinico

- [x] Convertir la vista de pacientes en historial clinico navegable.
- [x] Quitar el alta, edicion y eliminacion de pacientes desde este modulo.
- [x] Mostrar seguimientos y consultas clicables por paciente.

## PDF y Membrete Profesional

- [x] Crear generador PDF de consulta listo para impresion.
- [x] Seccion `Ajustes` para membrete del medico: nombre profesional, especialidades, direccion.
- [x] Configurar hasta 2 numeros de contacto y correo electronico en membrete.
- [x] Aplicar membrete configurable en todos los PDFs generados.

## Calidad y Cierre de Iteracion

- [x] Pruebas unitarias de flujo de consulta (creacion, edicion, seguimiento, PDF).
- [x] Pruebas de integracion para plantillas de tratamiento por tenant.
- [x] Validar exportacion PDF en desktop y mobile.

## Sugerencias de Implementacion (nuevas)

- [x] Añadir tabla `follow_up_tasks` para pendientes clinicos y alimentar KPI de seguimientos vencidos.
- [x] Crear vista materializada diaria para KPIs del dashboard y reducir costo de consultas repetidas.
- [x] Definir catalogo CIE local en IndexedDB con actualizacion incremental por version.
- [x] Registrar eventos de onboarding y ajuste de perfil en `audit_logs` para trazabilidad completa.
- [x] Diseñar estrategia de resolucion de conflictos por campo (last-write-wins por default + override manual).
- [x] Implementar sugerencias CIE asistidas por Gemini con fallback al catalogo local y aplicacion manual desde Consultas.
- [x] Añadir modo Seguimiento en Consultas con indicador de control pendiente por paciente y registro rapido de evolucion.
- [x] Añadir acceso directo desde historial de pacientes para abrir seguimiento precargado en Consultas.
- [x] Consolidar el esquema SQL de Supabase en un unico archivo de despliegue a produccion.
- [x] Añadir logo local en Ajustes para incluirlo en PDF sin almacenar en Supabase.

## Refactor Estructural (completado 2026-04-24)

- [x] Descomponer `consultas/page.tsx` de 1020 lineas a ~120 lineas con componentes enfocados.
- [x] Extraer `useConsultationWizard` hook con toda la logica del wizard.
- [x] Crear componentes por paso: `wizard-step-patient`, `wizard-step-diagnosis`, `wizard-step-treatment`, `wizard-step-confirm`.
- [x] Crear `wizard-navigation` y `patient-timeline` como componentes independientes.
- [x] Crear `TenantContext` para eliminar bootstrap duplicado de sesion en dashboard, consultas y pacientes.
- [x] Simplificar `dashboard/page.tsx` y `pacientes/page.tsx` con `useTenant()`.

## Iteracion 3 - Producto y UX Profesional

### Prioridad Alta — UX Core

- [x] Rediseñar layout y navegacion: sidebar colapsable en desktop, bottom nav en mobile, indicador de pagina activa.
- [x] Persistencia de estado al navegar: no perder informacion de paciente y consulta al cambiar de pagina (mantener contexto en TenantContext o state global).
- [x] Interaccion al cerrar sesion: modal de confirmacion con animacion, mensaje de despedida y limpieza visual antes de redirigir.
- [x] Loading states profesionales: skeletons con la estructura visual de cada pagina en vez de texto plano.

### Prioridad Alta — Funcionalidad Critica

- [x] Permitir borrar pacientes y consultas con confirmacion (soft-delete o hard-delete con modal).
- [x] Generar PDF de consulta despues de haberla realizado (boton "Generar PDF" en el historial del paciente y en el timeline).
- [x] Crear consulta con nombre y apellido separados: dos campos en vez de uno, con autocompletado que reconozca si el paciente ya existe por ID, nombre o apellido.
- [x] Validaciones inline en el wizard de consultas: bloquear avance de paso si faltan campos obligatorios con errores junto al campo.

### Prioridad Alta — Modelo de Paciente

- [x] Estado del paciente: activo, inactivo, en seguimiento, alta. Con icono visual en la lista de pacientes.
- [x] Permitir modificar el estado del paciente desde su perfil en la vista de pacientes.
- [x] Historial de seguimientos visible por paciente: timeline dedicado con filtro por seguimientos completados/pendientes/vencidos.
- [x] Panel de seguimientos pendientes: listado filtrable con urgentes, vencidos y proximos, accesible desde el dashboard.

### Prioridad Media — UX Mejoras

- [ ] Mejorar historial de pacientes: vista mas clara y visual (cards expandibles, filtros por fecha, estado, especialidad).
- [ ] Busqueda global accesible desde cualquier pantalla (pacientes, consultas, tratamientos).
- [ ] Visualizacion de datos en dashboard: mini-graficos de consultas por semana y desglose por especialidad.
- [ ] Preview de PDF antes de generar: opcion de guardar borrador sin generar PDF automaticamente.
- [ ] Dashboard mas amigable: accesos directos claros, resumen visual del dia, acciones rapidas prominentes.

### Prioridad Media — Paginas Rotas o Incompletas

- [x] Quitar "Especialidades" del nav (es un placeholder sin funcionalidad real, solo muestra stubs).
- [x] Convertir "Perfil" (/onboarding) en pagina de perfil editable que no redirija al dashboard tras guardar; mostrar feedback y permitir edicion continua.
- [x] Unificar "Perfil" y "Ajustes" si tiene sentido (hoy son dos paginas que configuran datos del medico por separado).

### Prioridad Baja

- [ ] Multi-usuario por clinica: compartir listado de pacientes entre medicos manteniendo aislamiento de historias.
- [ ] Implementar componentes clinicos reales: odontograma interactivo y curvas de crecimiento pediatrico.
- [ ] Mecanismo de backup de clave de cifrado: exportar/importar clave antes de limpiar el navegador.
- [ ] Tests E2E con Playwright: flujo completo login -> consulta -> PDF.
- [ ] Soporte dark mode usando los tokens CSS existentes.

### UX/UI General (aplicar FRONTEND_SKILL.md)

- [x] Revisar consistencia visual de toda la app: botones, inputs, estados vacios, alerts, modales.
- [x] Responsive y accesibilidad: contraste, foco visible, legibilidad en mobile.
- [ ] Tipografia y espaciado uniforme en todas las pantallas.

## Tus Sugerencias

### Repriorizacion sugerida (2 semanas) — 2026-04-24

#### Semana 1 (cierre funcional UX clinica)

- [x] Permitir modificar el estado del paciente desde su perfil en la vista de pacientes.
- [x] Historial de seguimientos visible por paciente con filtros: completados, pendientes y vencidos.
- [x] Panel de seguimientos pendientes en dashboard con filtros: urgentes, vencidos y proximos.
- [x] Convertir "Perfil" (/onboarding) en pagina editable continua (sin redireccion automatica tras guardar).

#### Semana 2 (coherencia producto y calidad visual)

- [x] Unificar "Perfil" y "Ajustes" o dejar una sola fuente de verdad por campo.
- [x] Revisar consistencia visual de toda la app: botones, inputs, estados vacios, alerts y modales.
- [x] Responsive y accesibilidad visual: contraste, foco visible y legibilidad en mobile.
- [ ] Visualizacion de datos en dashboard con mini-graficos (consultas por semana y por especialidad).

