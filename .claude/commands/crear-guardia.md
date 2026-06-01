---
description: Genera el guard/middleware específico para un rol de Glyphix
---

Crea el guard de acceso para el rol especificado: $ARGUMENTS

Ejemplo de uso:
- `/crear-guardia assistant` → guard para asistentes con lógica de custom_permissions
- `/crear-guardia receptionist` → guard con verificación de doctor_settings
- `/crear-guardia lab` → guard para laboratorio con restricción de búsqueda por ID

## Guards a generar por rol

### `owner` y `doctor` (roles clínicos completos)
- Verificar role === 'owner' || role === 'doctor'
- Verificar que la organización tiene subscription activa
- Para `doctor`: verificar que plan_type === 'clinica'

### `assistant`
- Verificar role === 'assistant'
- Incluir carga de `custom_permissions` desde `organization_members`
- Helper: `canViewPatients()` → verifica `custom_permissions.can_view_patients === true`
- En rutas de pacientes: aplicar guard adicional de `canViewPatients()`
- Bloquear acceso a: consultas, tratamientos, ajustes, referencias

### `clinic_admin`
- Verificar role === 'clinic_admin'
- Verificar plan_type === 'clinica'
- BLOQUEAR explícitamente rutas clínicas: /consultas, /pacientes (historia), /referencias
- Solo permitir: /admin/*, /ajustes (de clínica), /manual

### `receptionist`
- Verificar role === 'receptionist'
- Verificar plan_type === 'clinica'
- Cargar lista de médicos que tienen `receptionist_enabled = true` en `doctor_settings`
- Solo permitir agenda de médicos habilitados (filtrar por doctor_settings)
- Manejar `vacation_mode`: si un médico está de vacaciones, redirigir citas al `vacation_redirect_member_id`

### `lab` / `imaging` / `surgery`
- Verificar role === 'lab' | 'imaging' | 'surgery' según corresponda
- Verificar plan_type === 'clinica'
- En búsqueda de pacientes: SOLO permitir buscar por `identification_number`
- NUNCA exponer historia clínica completa, solo los datos mínimos de la orden
- Cargar solo las órdenes de `department_orders` filtradas por su `department_type` y `organization_id`

## Estructura del guard a generar

Para cada rol, generar:
1. Función/middleware del guard (adaptado al framework detectado)
2. HOC / wrapper de página si es frontend (Next.js, React Router, Vue Router, etc.)
3. Middleware de API si es backend
4. Ejemplo de uso en una ruta real del proyecto

## Notas de implementación
- Adapta al framework del proyecto
- Los guards de frontend son UX (protegen la vista) pero los de backend son seguridad real
- Ambos son obligatorios: nunca solo uno de los dos
- Incluir manejo de loading state mientras se verifican permisos (no mostrar flash del contenido)
