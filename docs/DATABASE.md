# 🗄️ Esquema de Base de Datos y Seguridad

## Modelo Multi-Tenant (Inquilino Múltiple)
Glyphix opera como una plataforma SaaS, alojando múltiples clínicas de forma simultánea. Para garantizar que los datos de la Clínica A jamás sean visibles para la Clínica B, se emplea un sistema estricto de aislamiento basado en **Row Level Security (RLS)** a nivel de base de datos.

### El Corazón del Aislamiento: `clinic_id`
Casi todas las tablas transaccionales (pacientes, órdenes de laboratorio, transacciones de caja, turnos) incluyen una columna obligatoria `clinic_id`. Esta columna actúa como la clave foránea del tenant.

### Políticas RLS
Las políticas RLS garantizan el aislamiento evaluando el contexto del usuario autenticado en cada consulta:
1. **Identificación**: Se invoca a la función helper de seguridad `public.get_user_clinic_ids()`.
2. **Validación de Membresía Activa**: Esta función consulta la tabla `clinic_members` asegurando no solo que el usuario pertenece a la clínica, sino que la condición `is_active = true` se cumple. Esto bloquea instantáneamente a ex-empleados.
3. **Aplicación**: Cada sentencia `SELECT`, `INSERT`, `UPDATE` o `DELETE` es interceptada y filtrada automáticamente.

Ejemplo de política segura para inserciones:
```sql
CREATE POLICY "tenant_isolation_insert"
ON public.cash_transactions
FOR INSERT
WITH CHECK (clinic_id = ANY(public.get_user_clinic_ids()));
```

## Role-Based Access Control (RBAC)
Los roles del sistema (Owner, Doctor, Receptionist, Clinic Admin, etc.) determinan qué operaciones puede realizar el usuario *dentro* de su tenant.
- **Owner / Clinic Admin**: Tienen permisos globales de lectura/escritura en su clínica, incluyendo flujos financieros (`/caja`) y configuraciones de miembros.
- **Doctor**: Acceso restringido a su propia agenda, expedientes clínicos y emisión de órdenes. Las vistas financieras se ofuscan.
- **Receptionist**: Acceso priorizado a gestión de turnos y caja rápida. El Onboarding es bypasseado.

## Optimización y Rendimiento
- **Índices Estratégicos**: Las claves de tenant (`clinic_id`) y los vectores de búsqueda en texto completo (`GIN/tsvector` para nombres de pacientes y folios) cuentan con índices dedicados para prevenir "table scans" cuando RLS se evalúa masivamente.
