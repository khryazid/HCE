---
description: Crea el sistema completo de autenticación y guards de roles para Glyphix
---

Implementa el sistema de autenticación y guards de acceso para Glyphix según CLAUDE.md.

El argumento indica qué parte implementar: $ARGUMENTS
Opciones: `todo`, `middleware`, `guards`, `session`, `helpers`
Si está vacío, implementa todo.

## Qué debe incluir

### 1. Middleware de autenticación (aplica a TODAS las rutas /app/*)
- Verificar que existe sesión activa → sino: redirect a /auth/login
- Cargar el usuario + su organización + su member record (role + custom_permissions)
- Verificar que la organización está activa (subscription_status != 'cancelled') → sino: redirect a /sin-plan
- Adjuntar `currentMember` al contexto/request para usarlo en guards posteriores

### 2. Guards por rol (un guard por cada ruta protegida)
Implementa un helper/función `requireRole(...roles)` que recibe uno o más roles y:
- Verifica que el rol del currentMember está en la lista permitida
- Si no → redirect al dashboard correcto según su rol (NO mostrar 403, redirigir)

Dashboard por rol:
```
owner / doctor   → /app/inicio
assistant        → /app/agenda
clinic_admin     → /app/admin
receptionist     → /app/recepcion
lab              → /app/lab
imaging          → /app/imagen
surgery          → /app/cirugia
```

### 3. Guard de permisos condicionales
Implementa `requirePermission(key)` que verifica `currentMember.custom_permissions[key] === true`
- Ejemplo de uso: `requirePermission('can_view_patients')` para asistentes
- Si no tiene el permiso → HTTP 403 con mensaje claro

### 4. Guard para plan clínica
Implementa `requireClinicPlan()` que verifica que `organization.plan_type === 'clinica'`
- Usar en: /app/referencias y cualquier función de referencias entre médicos

### 5. Helpers de sesión
- `getCurrentMember(req)` → devuelve el member completo con role y custom_permissions
- `isClinicPlan(org)` → boolean
- `hasPermission(member, key)` → boolean
- `canAccessRoute(member, route)` → boolean

## Reglas de implementación
- Adapta al framework detectado (Next.js middleware, Express middleware, Laravel middleware, etc.)
- Los guards deben aplicarse en FRONTEND y BACKEND por separado
- Nunca exponer datos de otro organization_id aunque el usuario esté autenticado
- Incluir tests unitarios básicos para los helpers
