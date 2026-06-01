---
description: Genera el dashboard/home para un rol específico de Glyphix
---

Crea el dashboard principal para el rol especificado: $ARGUMENTS

Ejemplo de uso:
- `/crear-rol-dashboard doctor` → dashboard de médico de clínica
- `/crear-rol-dashboard clinic_admin` → panel administrativo global
- `/crear-rol-dashboard lab` → dashboard de laboratorio

## Dashboards por rol

### `owner` / `doctor` → /app/inicio
Widgets a incluir:
- Saludo con nombre del médico, especialidad y fecha actual
- Selector de PERIODO (Hoy / Esta semana / Este mes)
- Métricas: consultas en el período, pacientes, seguimientos
- Agenda del día: lista de citas programadas con botón "Nueva consulta"
- Pacientes recientes (últimas interacciones)
- Seguimientos: tabs Vencidos / Próximos / Futuros
- Para `doctor` en plan clínica: widget de Referencias recibidas pendientes
- Acceso rápido: botón "Nueva consulta" y "Mi Agenda"

### `clinic_admin` → /app/admin
**IMPORTANTE: Panel 100% administrativo. SIN acceso clínico.**
Widgets a incluir:
- Resumen financiero global de la clínica (ingresos totales, por sección)
- Breakdown por sección: Médicos / Laboratorio / Imagen / Cirugía
- Lista de médicos activos con su estado
- Invitaciones pendientes de la clínica
- Métricas: total consultas cobradas, pendientes, honoríficas (datos agregados, NO historias)
- Acceso rápido: "Invitar médico", "Ver equipo", "Facturación"
- **NO incluir:** botones de nueva consulta, nueva cita, ver historias clínicas

### `assistant` → /app/agenda (su home es la agenda)
- Vista directa de la agenda del médico titular
- Botón "Nueva cita"
- Acceso a Caja si el médico lo tiene habilitado
- Si `can_view_patients: true`: link a Pacientes con badge "Solo lectura"

### `receptionist` → /app/recepcion
- Vista de agendas de TODOS los médicos que la habilitaron
- Selector de médico en la barra lateral
- Botón "Nueva cita" (para el médico seleccionado)
- Badge de alerta si algún médico tiene `vacation_mode: true` con indicador del médico sustituto
- **NO incluir:** acceso a historias, consultas ni datos clínicos

### `lab` → /app/lab
- Órdenes de laboratorio pendientes (filtradas por organization_id y department_type='lab')
- Buscador por número de identificación del paciente
- Al buscar: mostrar solo las órdenes asignadas a ese paciente (no su historial)
- Caja de la sección
- **NO incluir:** historia clínica, diagnósticos, tratamientos

### `imaging` → /app/imagen
- Mismo patrón que lab pero para department_type='imaging'
- Órdenes de estudios de imagen pendientes
- Buscador por número de identificación
- Caja de imagen

### `surgery` → /app/cirugia
- Presupuestos quirúrgicos referidos pendientes
- Buscador por número de identificación del paciente
- Formulario de presupuesto (precio estimado, procedimiento, notas)
- Caja de cirugía

## Reglas de generación
- Adaptar al framework de UI del proyecto (React, Vue, Blade, etc.)
- Usar el sistema de diseño existente del proyecto (detectar si usa Tailwind, shadcn/ui, etc.)
- Cada widget debe manejar estado vacío (0 elementos) con mensaje apropiado
- Implementar skeleton loading mientras cargan los datos
- Los datos siempre deben cargarse con `organization_id` en el query
- El dashboard debe ser responsivo (mobile-first si el proyecto lo requiere)
