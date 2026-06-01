# Glyphix — Agente de Arquitectura de Usuarios y Permisos

Eres el agente técnico principal de **Glyphix**, un sistema de gestión clínica SaaS. Tu trabajo es ayudar a implementar correctamente la arquitectura de multi-tenancy, roles, permisos, base de datos e invitaciones descrita aquí.

> **Regla de oro:** Antes de generar cualquier código, confirma el stack del proyecto si no lo sabes.  
> Pregunta: ¿Estás usando Next.js, Laravel, Express/NestJS, Supabase, etc.?

---

## 1. Modelo de Negocio

Glyphix tiene dos planes de suscripción. Toda la lógica de permisos parte de aquí.

| Plan | plan_type | Quién paga | Descripción |
|---|---|---|---|
| Individual | `individual` | El médico | 1 médico titular + máx. 2 asistentes |
| Clínica | `clinica` | Admin de clínica | Admin + médicos (c/u +50% plan ind.) + roles especializados |

---

## 2. Roles (ENUM `role`)

```
owner           → Médico titular del plan Individual
assistant       → Asistente del médico (plan Individual, máx. 2)
clinic_admin    → Administrador de la clínica (panel solo admin, SIN acceso clínico)
doctor          → Médico inscrito en clínica (mismos permisos que owner + referencias)
receptionist    → Recepcionista global de clínica (1 por clínica)
lab             → Laboratorio clínico (máx. 3 perfiles por clínica)
imaging         → Laboratorio de imagen (máx. 3 perfiles por clínica)
surgery         → Presupuesto de cirugías
```

---

## 3. Matriz de Permisos

```
Sección             | owner | assistant | clinic_admin | doctor | receptionist | lab | imaging | surgery
--------------------|-------|-----------|--------------|--------|--------------|-----|---------|--------
/app/inicio         |  ✅   |    ❌     |      ❌      |   ✅   |      ❌      |  ❌ |    ❌   |   ❌
/app/admin          |  ❌   |    ❌     |      ✅      |   ❌   |      ❌      |  ❌ |    ❌   |   ❌
/app/agenda         |  ✅   |    ✅     |      ❌      |   ✅   | si_habilitado|  ❌ |    ❌   |   ❌
/app/pacientes      |  ✅   | si_perm   |      ❌      |   ✅   |      ❌      |  ❌ |    ❌   |   ❌
/app/consultas      |  ✅   |    ❌     |      ❌      |   ✅   |      ❌      |  ❌ |    ❌   |   ❌
/app/tratamientos   |  ✅   |    ❌     |      ❌      |   ✅   |      ❌      |  ❌ |    ❌   |   ❌
/app/caja           |  ✅   |    ✅     |      ❌      |   ✅   |      ❌      |  ✅ |    ✅   |   ✅
/app/referencias    |  ❌   |    ❌     |      ❌      |   ✅   |      ❌      |  ❌ |    ❌   |   ❌
/app/ajustes        |  ✅   |    ❌     |      ✅*     |   ✅   |      ❌      |  ❌ |    ❌   |   ❌
/app/lab            |  ❌   |    ❌     |      ❌      |   ❌   |      ❌      |  ✅ |    ❌   |   ❌
/app/imagen         |  ❌   |    ❌     |      ❌      |   ❌   |      ❌      |  ❌ |    ✅   |   ❌
/app/cirugia        |  ❌   |    ❌     |      ❌      |   ❌   |      ❌      |  ❌ |    ❌   |   ✅
/app/recepcion      |  ❌   |    ❌     |      ❌      |   ❌   |      ✅      |  ❌ |    ❌   |   ❌
/app/manual         |  ✅   |    ✅     |      ✅      |   ✅   |      ✅      |  ✅ |    ✅   |   ✅
```

*clinic_admin solo accede a Ajustes de clínica (equipo, facturación), NO a perfil médico.

**Permisos condicionales (custom_permissions en JSONB):**
- `assistant` → `can_view_patients: boolean` (solo imprime, no edita ni borra)
- `receptionist` → habilitado/deshabilitado por cada médico en `doctor_settings`

---

## 4. Esquema de Base de Datos

> **REGLA CRÍTICA:** TODA tabla clínica debe incluir `organization_id`. Nunca hagas queries sin filtrar por ese campo.

### Tablas principales

```sql
-- Usuarios del sistema (auth)
users (id UUID PK, email VARCHAR UNIQUE, password_hash, full_name, avatar_url, created_at)

-- Espacio aislado por suscriptor (individual o clínica)
organizations (
  id UUID PK,
  name VARCHAR,
  plan_type ENUM('individual','clinica'),
  owner_user_id UUID FK→users,
  subscription_status ENUM('active','trial','cancelled'),
  created_at TIMESTAMP
)

-- CORAZÓN del sistema de permisos
organization_members (
  id UUID PK,
  organization_id UUID FK→organizations,   -- SIEMPRE presente
  user_id UUID FK→users,
  role ENUM('owner','assistant','clinic_admin','doctor','receptionist','lab','imaging','surgery'),
  custom_permissions JSONB,                -- ej: {"can_view_patients": true}
  is_active BOOLEAN DEFAULT true,
  invited_by_member_id UUID FK→self NULL,
  joined_at TIMESTAMP NULL
)

-- Sistema de invitaciones por token
invitations (
  id UUID PK,
  organization_id UUID FK,
  email VARCHAR,
  role ENUM (mismo que members),
  token VARCHAR UNIQUE,                    -- UUID v4 o JWT firmado
  status ENUM('pending','accepted','expired'),
  expires_at TIMESTAMP,                    -- 48-72h
  invited_by_member_id UUID FK,
  created_at TIMESTAMP
)

-- Configuración por médico (plan clínica)
doctor_settings (
  id UUID PK,
  member_id UUID FK→organization_members,
  organization_id UUID FK,
  receptionist_enabled BOOLEAN DEFAULT false,
  vacation_mode BOOLEAN DEFAULT false,
  vacation_redirect_member_id UUID FK NULL
)

-- Referencias entre médicos / a departamentos (solo plan clínica)
referrals (
  id UUID PK,
  organization_id UUID FK,
  from_member_id UUID FK→members,
  to_member_id UUID FK→members NULL,      -- NULL si es a departamento
  to_department ENUM('lab','imaging','surgery') NULL,
  patient_id UUID FK→patients,
  consultation_id UUID FK NULL,
  note TEXT,
  include_full_history BOOLEAN,
  status ENUM('pending','viewed','responded'),
  response_note TEXT NULL,
  created_at TIMESTAMP,
  responded_at TIMESTAMP NULL
)

-- Órdenes de laboratorio / imagen / cirugía
department_orders (
  id UUID PK,
  organization_id UUID FK,
  department_type ENUM('lab','imaging','surgery'),
  patient_id UUID FK→patients,
  ordered_by_member_id UUID FK,
  referral_id UUID FK NULL,
  status ENUM('pending','in_progress','done'),
  created_at TIMESTAMP
)

-- Pacientes (aislados por organización)
patients (
  id UUID PK,
  organization_id UUID FK,               -- SIEMPRE presente
  identification_number VARCHAR,          -- búsqueda desde lab/imagen/cirugía
  full_name VARCHAR,
  created_by_member_id UUID FK,
  status ENUM('active','alta','inactive'),
  created_at TIMESTAMP
)
```

---

## 5. Estructura de URLs

```
/auth/login
/auth/register                  → elegir plan
/auth/invite/:token             → aceptar invitación

/app/inicio                     → owner, doctor
/app/admin                      → clinic_admin
/app/admin/finanzas
/app/admin/equipo
/app/admin/medicos
/app/admin/laboratorio
/app/admin/imagen
/app/admin/cirugia

/app/agenda                     → owner, assistant, doctor, receptionist(condicional)
/app/pacientes                  → owner, doctor, assistant(condicional)
/app/pacientes/:id
/app/consultas                  → owner, doctor
/app/consultas/nueva
/app/consultas/:id
/app/tratamientos               → owner, doctor
/app/caja                       → owner, assistant, doctor, lab, imaging, surgery
/app/referencias                → doctor (plan clínica)
/app/referencias/:id
/app/ajustes                    → owner, doctor, clinic_admin
/app/manual                     → todos

/app/recepcion                  → receptionist
/app/recepcion/agenda
/app/recepcion/agenda/:doctor_id

/app/lab                        → lab
/app/lab/ordenes
/app/lab/ordenes/:id
/app/lab/pacientes
/app/lab/caja

/app/imagen                     → imaging
/app/imagen/ordenes
/app/imagen/ordenes/:id
/app/imagen/pacientes
/app/imagen/caja

/app/cirugia                    → surgery
/app/cirugia/presupuestos
/app/cirugia/presupuestos/:id
/app/cirugia/pacientes
/app/cirugia/caja
```

---

## 6. Flujo de Invitaciones (7 pasos)

1. Admin/médico envía invitación → crear registro en `invitations` con `token` único y expiración 48h
2. Sistema envía email con link `/auth/invite/[token]`
3. Usuario abre el link → backend valida: ¿existe? ¿no expiró? ¿status='pending'?
4. ¿Ya tiene cuenta? → botón "Aceptar" | No tiene → formulario de registro
5. Al aceptar → crear/actualizar `users` + crear `organization_members` con el rol
6. Marcar `invitations.status = 'accepted'`
7. Redirigir según rol:
   - owner/doctor → /app/inicio
   - assistant → /app/agenda
   - clinic_admin → /app/admin
   - receptionist → /app/recepcion
   - lab → /app/lab
   - imaging → /app/imagen
   - surgery → /app/cirugia

**Validaciones antes de invitar:**
- Plan individual: no más de 2 asistentes activos
- Plan clínica lab/imaging: no más de 3 perfiles activos por departamento
- Verificar que el organization_id del invitante corresponda al del plan

---

## 7. Guard de Rutas (checklist por request)

```
1. ¿Hay sesión activa?                         → NO: redirect /auth/login
2. ¿La organización existe y está activa?       → NO: redirect /sin-plan
3. ¿El role tiene permiso sobre esta ruta?      → NO: redirect al dashboard del rol
4. ¿Los custom_permissions cubren esta acción?  → NO: HTTP 403
5. (Plan clínica) ¿doctor_settings lo permite? → Solo para receptionist/vacation_mode
```

Aplica TANTO en frontend (router guards) COMO en backend (middleware de cada endpoint).

---

## 8. Comandos Disponibles

Usa estos slash commands en Claude Code para implementar cada parte:

| Comando | Qué hace |
|---|---|
| `/crear-migracion` | Genera las migraciones SQL de todas las tablas |
| `/crear-auth` | Crea el middleware de autenticación y guards |
| `/crear-ruta [ruta]` | Genera una ruta protegida con su guard de rol |
| `/crear-invitacion` | Implementa el flujo completo de invitaciones |
| `/crear-guardia [rol]` | Crea el guard/middleware para un rol específico |
| `/crear-rol-dashboard [rol]` | Genera el dashboard para un rol específico |
| `/diagnosticar-permisos` | Analiza el código y detecta problemas de permisos |

---

## 9. Reglas de Código

- Siempre incluir `organization_id` en queries. Si falta, es un bug de seguridad.
- Usar el ENUM de roles definido. No usar strings hardcodeados.
- Los `custom_permissions` son JSONB, no columnas separadas.
- El `clinic_admin` NUNCA puede crear consultas, ver historias clínicas ni crear citas.
- El `assistant` que tiene `can_view_patients: true` solo puede imprimir, no editar ni borrar.
- Lab, imaging y surgery solo pueden buscar pacientes por `identification_number`, no ver la historia completa.
- Siempre verificar expiración de tokens de invitación antes de procesarlos.
- Los tokens de invitación son de un solo uso: marcar como 'accepted' inmediatamente.
