---
description: Analiza el código del proyecto y detecta problemas en el sistema de permisos de Glyphix
---

Analiza el proyecto actual y detecta problemas de permisos, seguridad y arquitectura multi-tenant.

El argumento indica qué tipo de diagnóstico hacer: $ARGUMENTS
Opciones: `todo`, `multitenancy`, `roles`, `rutas`, `invitaciones`, `bd`
Si está vacío, ejecuta el diagnóstico completo.

## Proceso de diagnóstico

### 1. Escanear queries de base de datos
Busca todas las queries/consultas en el proyecto y verifica:
- [ ] ¿Todas las queries incluyen `organization_id` en el WHERE?
- [ ] ¿Hay queries que devuelven datos de múltiples organizaciones sin filtro?
- [ ] ¿Los joins entre tablas mantienen el filtro de `organization_id`?
- [ ] ¿Hay queries de pacientes que no filtran por `organization_id`?

**Reportar:** lista de archivos/líneas con queries inseguras.

### 2. Verificar guards de rutas
Revisa todas las rutas/páginas del proyecto:
- [ ] ¿Cada ruta /app/* tiene middleware de autenticación?
- [ ] ¿Cada ruta verifica el rol correcto según la matriz en CLAUDE.md?
- [ ] ¿Hay rutas que solo tienen guard en frontend pero no en el API?
- [ ] ¿Hay rutas de clinic_admin que permiten acciones clínicas?
- [ ] ¿El guard del assistant verifica `can_view_patients` antes de mostrar pacientes?
- [ ] ¿El guard del receptionist verifica `receptionist_enabled` en doctor_settings?

**Reportar:** rutas sin guard o con guard incorrecto.

### 3. Verificar el sistema de invitaciones
Busca el código de invitaciones y verifica:
- [ ] ¿Se valida el límite de 2 asistentes antes de crear la invitación?
- [ ] ¿Se valida el límite de 3 lab/imaging antes de crear la invitación?
- [ ] ¿El token tiene expiración configurada?
- [ ] ¿El token se marca como 'accepted' tras el primer uso?
- [ ] ¿La aceptación es atómica (transacción de BD)?
- [ ] ¿Se valida que el email de la invitación coincide con el usuario que acepta?

**Reportar:** problemas encontrados en el flujo de invitaciones.

### 4. Verificar el ENUM de roles
Busca strings de roles hardcodeados en el código:
- [ ] ¿Hay strings como `'admin'` en vez de `'clinic_admin'`?
- [ ] ¿Hay strings como `'medico'` en vez de `'doctor'`?
- [ ] ¿Se usa una constante/enum central o strings dispersos?
- [ ] ¿Hay roles inventados que no están en la arquitectura?

**Reportar:** inconsistencias en nombres de roles.

### 5. Verificar restricciones de lab/imaging/surgery
Busca el código de estos roles y verifica:
- [ ] ¿Solo pueden ver órdenes de su `department_type`?
- [ ] ¿La búsqueda de pacientes devuelve solo `identification_number` y datos de la orden?
- [ ] ¿No tienen acceso a la historia clínica completa?
- [ ] ¿Sus queries de caja filtran por `organization_id` Y por su rol?

**Reportar:** exposición de datos clínicos a roles no autorizados.

### 6. Verificar referencias entre médicos
Busca el código de referencias y verifica:
- [ ] ¿Solo los roles `doctor` pueden crear referencias?
- [ ] ¿Se verifica que ambos médicos (from/to) pertenecen a la misma organización?
- [ ] ¿Los datos de la historia referida son solo los del consultation_id, no todo el historial?
- [ ] ¿El médico receptor puede responder la referencia?

**Reportar:** problemas en el flujo de referencias.

## Formato de reporte

Al terminar el análisis, genera un reporte con este formato:

```
## Diagnóstico de Permisos — Glyphix
Fecha: [fecha actual]

### 🔴 Críticos (riesgo de seguridad)
- [problema] → [archivo:línea] → [solución recomendada]

### 🟡 Importantes (comportamiento incorrecto)  
- [problema] → [archivo:línea] → [solución recomendada]

### 🟢 OK
- [verificación pasada]

### Siguiente paso recomendado
[comando Claude Code a ejecutar para resolver el problema más crítico]
```

Después de mostrar el reporte, pregunta: "¿Quieres que corrija alguno de estos problemas ahora?"
