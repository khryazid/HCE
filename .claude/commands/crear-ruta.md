---
description: Genera una ruta/página protegida con su guard de rol para Glyphix
---

Crea la ruta protegida especificada en: $ARGUMENTS

Ejemplo de uso:
- `/crear-ruta /app/referencias` → genera la página de referencias para doctores
- `/crear-ruta /app/lab/ordenes` → genera la página de órdenes para laboratorio
- `/crear-ruta /app/admin/finanzas` → genera el panel financiero para clinic_admin

## Proceso a seguir

### Paso 1: Identificar la ruta en CLAUDE.md
Busca la ruta en la sección "Estructura de URLs" del CLAUDE.md y determina:
- Qué roles tienen acceso
- Si hay permisos condicionales
- Qué datos necesita mostrar según la arquitectura

### Paso 2: Implementar el guard
Aplica `requireRole(...)` con los roles correctos según la matriz de permisos del CLAUDE.md.
Si tiene permisos condicionales, agrega `requirePermission(...)` también.

### Paso 3: Generar la estructura de la página/ruta
- Layout / componente principal
- Carga de datos con `organization_id` siempre presente en la query
- Estados: loading, empty, error
- Acciones permitidas según el rol (botones solo si tiene permiso de escritura)

### Paso 4: Generar el endpoint API correspondiente
- Endpoint con middleware de auth aplicado
- Validación de `organization_id` en cada query
- Respuesta tipada

### Paso 5: Conectar con el sidebar/navegación
- Verificar que el link a esta ruta solo aparece en el nav para los roles con acceso
- Ocultar el link para roles sin acceso (no solo deshabilitar)

## Reglas
- NUNCA mostrar datos de pacientes completos a roles lab, imaging o surgery (solo identification_number)
- clinic_admin NO debe tener ningún botón de acción clínica (crear citas, consultas, etc.)
- El assistant con `can_view_patients: true` solo ve botón de imprimir, nunca de editar/borrar
- Siempre incluir `organization_id` en todas las queries a la base de datos
