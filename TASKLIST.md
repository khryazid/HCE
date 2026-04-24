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
