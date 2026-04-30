# docs/AGENT_PRD.md

## 1. Modelos de Dominio (Esquema de BD Inicial)
- **Users:** `id`, `role` (Super_Admin, Clinic_Admin, Doctor, Assistant), `clinic_id` (FK, nullable), `name`, `email`.
- **Clinics:** `id`, `name`, `subscription_status`, `subscription_type` (Stripe/Manual).
- **Patients:** `id`, `clinic_id` (FK), `first_name`, `last_name`, `dob`, `gender`, `contact_info`.
- **Consultations (Historias):** `id`, `patient_id` (FK), `doctor_id` (FK), `date`, `symptoms`, `diagnosis`, `notes`.
- **Prescriptions (Récipes):** `id`, `consultation_id` (FK), `medication_details`, `instructions`, `format_type`.

## 2. Fases de Implementación Secuencial
1. **Fase 1: Infraestructura.** Configuración de Next.js, Supabase, Tailwind, shadcn/ui.
2. **Fase 2: Autenticación y Autorización.** RLS en Postgres, SSO, y Middlewares para protección de rutas según rol.
3. **Fase 3: Gestión Core.** CRUD de Pacientes (React Query para caché).
4. **Fase 4: Flujo Clínico.** Consultas, generación de PDF en cliente (Récipes y Órdenes), y envío vía Resend.
5. **Fase 5: Onboarding B2B/B2C.** Formularios manuales de venta e integración Stripe básica.

## 3. Catálogo de Estados por Característica Clave
Para la vista de "Perfil del Paciente y Consultas":
- **Loading:** Skeleton UI simulando la estructura de la tarjeta del paciente.
- **Empty State:** Ilustración sutil + Botón primario: "Crear primera historia médica".
- **Error:** Toast notification color rojo (`destructive`) con botón de reintento.
- **Success:** Toast notification color verde + actualización optimista de React Query.

## 4. Criterios de Aceptación (Testables)
- **CA1 (Permisos):** Un usuario con rol `Assistant` puede ver la agenda y presionar "Reimprimir", pero si intenta acceder al endpoint `GET /api/consultations/notes`, el servidor devuelve 403 Forbidden.
- **CA2 (Multitenancy):** Un `Doctor` de la `Clinica A` no puede consultar el `patient_id` registrado por la `Clinica B`. RLS debe bloquear la query a nivel de DB.
- **CA3 (Récipes):** El sistema debe generar un PDF con la receta médica en al menos 2 formatos (Estándar y Vertical dividido) y ofrecer las opciones "Descargar PDF" o "Enviar al correo del paciente".

## 5. Requisitos No Funcionales (NFRs)
- **Rendimiento:** LCP (Largest Contentful Paint) menor a 2.5 segundos.
- **Tiempo de Respuesta:** Consultas de la base de datos de pacientes cacheadas deben renderizarse en menos de 100ms.
- **Compatibilidad:** 100% responsivo. Las tablas de pacientes deben colapsar en formato de "tarjeta" en dispositivos móviles menores a 768px.