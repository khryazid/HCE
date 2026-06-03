# DICTAMEN DE AUDITORÍA TÉCNICA Y ESTRATEGIA DE MITIGACIÓN: SISTEMA GLYPHIX
**De:** Khristian [Apellido] – Dirección de Tecnología (CTO) / Líder de Desarrollo
**Para:** Dr. Daniel [Tu Apellido] (Dirección Ejecutiva) & Junta Directiva
**Fecha:** 3 de Junio de 2026
**Asunto:** Respuestas al Pliego de Auditoría Técnica (khryazid/HCE) y Plan de Remediación para Fase de Adquisición.

---

Estimado Dr. Daniel y miembros de la junta,

Tras revisar exhaustivamente el pliego de auditoría técnica emitido sobre la arquitectura del sistema **HCE (Glyphix)**, presento a continuación las respuestas periciales detalladas desde la dirección de tecnología. Entendemos la criticidad del sistema, especialmente por su enfoque offline-first y la naturaleza sensible de los datos clínicos multitenant.

A continuación, abordo cada uno de los módulos auditados, explicando las mitigaciones actuales en nuestro código base y confirmando los compromisos requeridos para la liberación de la inversión corporativa.

---

### MÓDULO I: EL MOTOR OFFLINE-FIRST Y RESILIENCIA DE DATOS EN EL EDGE

**1. Mitigación del Clock-Drift y Last-Write-Wins (LWW)**
El motor local (Sync Worker) no confía ciegamente en una estrategia LWW que destruya datos. Hemos diseñado un mecanismo de resolución de conflictos defensivo. En nuestro `sync-worker.ts`, durante la evaluación pre-sincronización, comparamos el `client_timestamp` del payload local contra el `updated_at` de la base de datos central:
```typescript
const remoteTime = remote?.updated_at ? Date.parse(remote.updated_at) : Number.NEGATIVE_INFINITY;
if (remoteTime > item.client_timestamp) {
  // Conflicto de reloj...
}
```
Si el registro en Supabase es más reciente que la petición local (Clock-Drift provocado por edición concurrente del Médico B), **el servidor NO destruye la información**. En su lugar, el Sync Worker aborta el _upsert_ silencioso, marca el item local como `"conflicted"` y emite el evento `APP_EVENT_SYNC_ABANDONED`. Esto levanta una alerta en la interfaz (Ajustes › Sincronización), delegando el arbitraje final al criterio humano del médico, preservando la inmutabilidad de la historia clínica en el servidor central.

**2. Saturación de IndexedDB en Dispositivos Móviles (Offline Prolongado)**
Para mitigar que IndexedDB colapse la memoria en navegadores limitados durante jornadas offline, implementamos una rutina de limpieza preventiva (`pruneOldSyncQueueItems(7, 30)`) que se ejecuta estrictamente al inicio de cada ciclo de `flushSyncQueue()`. Esta función purga registros de colas ya sincronizados hace más de 7 días y descarta inteligentemente _logs_ abandonados con más de 30 días. Si la cuota general del navegador se llena antes, el adaptador del cliente priorizaría tablas críticas (`clinical_records` y `patients` tienen prioridad algorítmica 1 y 2 respectivamente) por encima de vistas temporales.

---

### MÓDULO II: ARQUITECTURA MULTI-TENANT Y SEGURIDAD CRIPTOGRÁFICA EN BASE DE DATOS

**1. Rendimiento del RLS y Bloqueo de Ex-Empleados (get_user_clinic_ids)**
La función `get_user_clinic_ids()` efectivamente consulta las tablas `profiles` y `clinic_members` evaluando `is_active = true` para bloquear ex-empleados al instante.
Para evitar que esto degrade el rendimiento mediante subconsultas repetitivas en cada validación de fila (Row Level Security), la función ha sido declarada explícitamente en el esquema SQL con el modificador `STABLE` (`language sql stable security definer`).
El motor de PostgreSQL (y el planificador de Supabase) sabe que una función `STABLE` no modificará la base de datos y retornará el mismo resultado con los mismos argumentos durante un escaneo de tabla. Esto permite que el planificador cachee en memoria el arreglo de `clinic_ids` permitidos en la primera evaluación de la transacción, reduciendo a `O(1)` el costo en las validaciones de RLS subsiguientes sobre miles de pacientes. Además, todas las tablas clínicas cuentan con índices compuestos (`idx_patients_tenant`, `idx_records_tenant` sobre `clinic_id, doctor_id`), evitando _Table Scans_ secuenciales.

---

### MÓDULO III: MATRIZ CORPORATIVA DE ROLES (RBAC) Y SEGURIDAD DE ENRUTAMIENTO

**1. Vulnerabilidad de los JSONB de custom_permissions**
La auditoría es correcta y señala un vector de ataque válido. Actualmente, los accesos dinámicos condicionales granulares almacenados en el campo `custom_permissions` (JSONB) dentro de `clinic_members` son evaluados y respetados primordialmente a nivel de componentes de Next.js (Frontend) y en los _Route Guards_.
Si un atacante interno malicioso con rol de "Asistente" extrajera su JWT válido y realizara peticiones directas a la API REST de Supabase, las políticas actuales de RLS (que validan primariamente el `clinic_id`) permitirían la extracción del catálogo de pacientes.
**Mitigación:** Como acción inmediata para cerrar la brecha antes de la adquisición, migraremos la evaluación del JSONB hacia funciones _Security Definer_ nativas en la base de datos. Modificaremos las políticas RLS para que verifiquen, mediante el operador `@>` de JSONB, si el asistente posee explícitamente la bandera `{"can_view_patients": true}` antes de permitir un `SELECT`.

---

### MÓDULO IV: INTEGRIDAD DEL FLUJO CLÍNICO Y EL ASISTENTE IA (CIE-11)

**1. Sanitización en la API de Inteligencia Artificial**
Para la sugerencia diagnóstica con Gemini 2.0 Flash, hemos aislado los datos. El endpoint `/api/cie-suggestions/route.ts` únicamente extrae los campos narrativos clíniocs (`diagnosis`, `symptoms`, `anamnesis`) bajo un límite estricto de 1200 caracteres. El payload no requiere, ni procesa, el `patient_id` ni el nombre del paciente. La anonimización (eliminación de PII) es sistémica por omisión en el diseño de la API antes de salir de nuestra infraestructura.

**2. Aislamiento Técnico (Rol Lab/Imagen) y Vacation Mode**
*   **Búsqueda Técnica:** Las restricciones para evitar fuerza bruta de enumeración de IDs en roles técnicos se integrarán al RLS de la tabla `medical_referrals` y `lab_orders`, requiriendo un `status` activo y un vínculo directo con la orden en curso.
*   **Vacation Mode:** La delegación de expedientes mediante `vacation_redirect_member_id` requiere una evaluación dinámica de tiempos. Implementaremos un Cron Job a nivel base de datos (con `pg_cron` o Edge Functions) para anular automáticamente esta delegación transcurrida la ventana de vacaciones, previniendo que el Médico B retenga acceso permanente.

---

### MÓDULO V: CONCILIACIÓN FINANCIERA EXTERNA E INTEGRIDAD CONTABLE

**1. Prevención de Replay Attacks en Stripe**
En el handler `/api/stripe/webhook/route.ts`, insertamos atómicamente el ID del evento de Stripe (`event.id`) en la tabla `stripe_webhook_events`. Si el servidor sufre concurrencia o alta latencia de red e intenta procesar el evento duplicado, la restricción `UNIQUE CONSTRAINT` de PostgreSQL arroja inmediatamente el código de error `23505`. Nuestro código captura este error, lo marca como una petición idempotente ya procesada y responde 200 a Stripe sin alterar la base de datos principal, blindando la facturación.

**2. Trazabilidad de Cajas y Ausencia de `cash_shifts`**
Confirmo el hallazgo expuesto en el pliego: la tabla `cash_shifts` (Turnos de Caja) no existe en la migración de producción `000_production_full_schema.sql`. Actualmente, los cobros (tabla `cash_transactions`) fluyen directamente contra la clínica sin el encadenamiento de apertura/cierre de turnos de operadores individuales (Recepcionistas).
Esta deuda arquitectónica representa un riesgo contable offline inaceptable. **Acepto el requerimiento técnico** de normalizar el esquema introduciendo la tabla física `cash_shifts` para garantizar la conciliación inmutable y el arqueo diario ante auditorías de Hacienda.

---

### 📈 RESPUESTA A LOS CRITERIOS DE DICTAMEN TÉCNICO (Cierre de Negociación)

En mi capacidad de Líder de Tecnología, asumo formalmente el compromiso con los tres hitos de bloqueo presentados por la junta:

1.  **Demostración en Vivo de Bloqueo de RLS:** En la sesión presencial, ejecutaré las simulaciones de ataque vía consola SQL inyectando un token malicioso. Quedará demostrado que PostgreSQL deniega la lectura devolviendo un arreglo vacío (Policy Violation) independientemente de la interfaz en React.
2.  **Plan de Elevación de Cobertura (Milestone Obligatorio):** Firmaré la cláusula técnica. Congelaremos el desarrollo de nuevas vistas (UI) durante el próximo _Sprint_ para implementar tests e2e (Playwright) enfocados en el `sync-worker.ts`, persistencia de IndexedDB y validación de políticas de base de datos, elevando la cobertura del 47% al 85% automatizado por GitHub Actions.
3.  **Normalización de Esquema de Caja:** Desplegaremos de inmediato la migración del modelo relacional introduciendo la tabla `cash_shifts` y vinculándola transaccionalmente a `cash_transactions`, blindando la trazabilidad de la recepción.

Agradezco la rigurosidad de esta evaluación. Este nivel de auditoría valida la robustez actual del proyecto y nos alinea perfectamente con los estándares de nivel corporativo (Enterprise-Grade) requeridos para el éxito de la venta del software.

Quedo a su disposición para la lectura de este dictamen en la agenda de debate.

Atentamente,

**Khristian [Apellido]**
Dirección de Tecnología (CTO)
Proyecto Glyphix (HCE)
