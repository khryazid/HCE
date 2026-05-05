# HCE analisis y tasklist

Fecha: 2026-05-03

## Alcance
- Revision de esquema SQL (Supabase) vs tipado y uso en app.
- Riesgos de seguridad y deuda tecnica detectada.
- Tareas sugeridas y ordenadas por prioridad.

## Hallazgos principales

### Seguridad y multitenancy
- Tabla `push_subscriptions` no tiene RLS ni policies en el schema.
- Las rutas de push aceptan `clinic_id` y `target_doctor_id` desde el body; con sesion valida se puede cruzar tenant si no se valida ownership.

### Alineacion SQL vs tipos
- `subscription_expires_at` existe en el schema, pero no en `src/types/supabase.types.ts`.
- El admin UI usa `subscription_expires_at`, por lo que el tipado quedo desalineado.

### Mantenibilidad del schema
- El schema vive en un unico script idempotente (no hay migraciones versionadas).
- Esto dificulta auditoria de cambios, rollback y validacion automatica.

### Estabilidad y performance
- PDF usa `logo_data_url` y `signature_data_url` sin compresion/resize, riesgo de picos de memoria y fallos en dispositivos modestos.

### Tipado y robustez del sync
- El `sync-worker` usa casts `as any/unknown` para clientes y RPC, lo que oculta cambios de esquema.

## Tareas (prioridad)

### P0 (critico)
- [ ] Agregar RLS y policies para `push_subscriptions`.
- [ ] Validar ownership (clinic_id/doctor_id) en APIs de push; no confiar en el body.

### P1 (alto)
- [ ] Regenerar tipos Supabase y alinear `subscription_expires_at`.
- [ ] Definir flujo de migraciones como fuente de verdad (aunque sea un baseline).
- [ ] Comprimir/redimensionar logo y firma antes de guardar o al generar PDF.

### P2 (medio)
- [ ] Endurecer tipado del `sync-worker` para evitar casts inseguros.
- [ ] Ejecutar `lint`, `typecheck` y suites de tests para validar estado real.

## Notas adicionales
- Schema fuente: `src/lib/supabase/000_production_full_schema.sql`.
- Tipos: `src/types/supabase.types.ts`.
- API push: `src/app/api/push/subscribe/route.ts`, `src/app/api/push/send/route.ts`.
- PDF: `src/features/consultations/lib/pdf.ts`.
