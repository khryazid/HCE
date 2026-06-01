---
description: Genera las migraciones de base de datos completas para la arquitectura de Glyphix (multi-tenant, RBAC)
---

Genera las migraciones de base de datos para la arquitectura completa de Glyphix según lo definido en CLAUDE.md.

El argumento opcional indica qué tabla(s) crear: $ARGUMENTS
Si no hay argumento, genera TODAS las migraciones en el orden correcto.

## Orden de migraciones a generar

1. `users` — tabla de autenticación base
2. `organizations` — espacios aislados (multi-tenant)
3. `organization_members` — corazón del RBAC con custom_permissions JSONB
4. `invitations` — sistema de invitaciones por token
5. `patients` — siempre con organization_id
6. `doctor_settings` — configuración de recepcionista y vacaciones
7. `referrals` — referencias entre médicos y a departamentos
8. `department_orders` — órdenes de lab, imagen y cirugía

## Instrucciones

- Detecta el framework y ORM del proyecto antes de generar (Prisma, Sequelize, TypeORM, Laravel Eloquent, raw SQL, etc.)
- Usa el ENUM exacto de roles: `owner`, `assistant`, `clinic_admin`, `doctor`, `receptionist`, `lab`, `imaging`, `surgery`
- El campo `custom_permissions` en `organization_members` debe ser JSONB (PostgreSQL) o JSON (MySQL)
- SIEMPRE agrega índices en: `organization_id`, `user_id`, `role`, `token` (en invitations), `identification_number` (en patients)
- Agrega `ON DELETE CASCADE` donde corresponda siguiendo la jerarquía: organizations → members → everything else
- Incluye un comentario encima de cada tabla explicando su propósito
- Al terminar muestra el orden de ejecución de las migraciones
