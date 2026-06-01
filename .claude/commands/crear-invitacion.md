---
description: Implementa el flujo completo de invitaciones por token para Glyphix
---

Implementa el sistema de invitaciones por token de Glyphix según los 7 pasos del CLAUDE.md.

El argumento indica qué parte del flujo implementar: $ARGUMENTS
Opciones: `todo`, `enviar`, `validar`, `aceptar`, `email`, `redirect`
Si está vacío, implementa el flujo completo.

## Flujo completo a implementar

### Parte 1: Enviar invitación (desde Ajustes → Equipo Clínico)
Crear endpoint `POST /api/invitations`:
- Validar que el invitante tiene rol con permisos para invitar (owner, clinic_admin, doctor)
- **Validar límites ANTES de crear la invitación:**
  - Plan individual: máximo 2 `assistant` activos (is_active=true)
  - Plan clínica lab: máximo 3 perfiles `lab` activos
  - Plan clínica imaging: máximo 3 perfiles `imaging` activos
- Generar token UUID v4 único
- Insertar en tabla `invitations` con status='pending' y expires_at = now() + 72h
- Disparar envío del email (ver Parte 5)
- Responder con confirmación (NO devolver el token en la respuesta)

### Parte 2: Validar token (GET /auth/invite/:token)
- Buscar la invitación por token
- Verificar: ¿existe? → sino: "Invitación no encontrada"
- Verificar: ¿status === 'pending'? → sino: "Esta invitación ya fue utilizada"
- Verificar: ¿expires_at > now()? → sino: "Esta invitación venció. Contacta al administrador."
- Si todo OK → mostrar página de aceptación con nombre de la clínica/médico y rol

### Parte 3: Aceptar invitación (POST /api/invitations/:token/accept)
**Escenario A — El email ya tiene cuenta:**
- Verificar que la sesión activa corresponde al email de la invitación
- Crear registro en `organization_members` con el rol de la invitación
- Actualizar `invitations.status = 'accepted'` e `invitations.joined_at = now()`

**Escenario B — El email no tiene cuenta:**
- Mostrar formulario de registro (nombre completo + contraseña)
- Crear `users` record
- Crear `organization_members` record
- Marcar la invitación como aceptada
- Todo en una transacción de base de datos (atomicidad)

**En ambos escenarios:**
- El token queda permanentemente inutilizable tras ser aceptado

### Parte 4: Redirección post-aceptación
Después de aceptar, redirigir según el rol:
```
owner / doctor   → /app/inicio
assistant        → /app/agenda
clinic_admin     → /app/admin
receptionist     → /app/recepcion
lab              → /app/lab
imaging          → /app/imagen
surgery          → /app/cirugia
```

### Parte 5: Template del email de invitación
Generar el template HTML del email con:
- Nombre de quien invita y nombre de la clínica/médico
- Rol asignado en lenguaje legible (no el enum técnico)
- Botón CTA: "Aceptar invitación" → link con el token embebido en la ruta
- Mensaje de expiración (ej: "Este enlace expira en 72 horas")
- Fallback: si el botón no funciona, mostrar la URL completa

### Parte 6: Listado y gestión de invitaciones pendientes
Endpoint `GET /api/invitations` → devuelve invitaciones pendientes de la organización
Endpoint `DELETE /api/invitations/:id` → cancela una invitación pendiente (status='expired')

## Reglas de seguridad
- El token NUNCA debe aparecer en logs del servidor
- Usar transacciones de BD en el paso de aceptación para garantizar atomicidad
- Siempre verificar que el `organization_id` de la invitación coincide con el del invitante
- Rate limiting en el endpoint de envío de invitaciones (máx 10/hora por organización)
