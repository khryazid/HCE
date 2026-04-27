# Migraciones SQL — Archivo histórico

> ⚠️ **ADVERTENCIA: Estos archivos son OBSOLETOS. NO ejecutar en producción.**

Estos scripts de migración iterativa han sido **reemplazados en su totalidad** por el archivo consolidado:

```
lib/supabase/000_production_full_schema.sql
```

## Por qué no debes ejecutar estos archivos

| Archivo | Problema |
|---|---|
| `001_init_schema.sql` | Las políticas RLS de `patients` **no incluyen `clinic_id`** — inseguro en entornos multi-tenant. La versión corregida está en `000`. |
| `002_iteration2_followups.sql` | Agrega `follow_up_tasks`. Ya incluido en `000`. |
| `003_iteration3_patients.sql` | Agrega columna `status` a `patients`. Ya incluido en `000`. |
| `004_cie_rate_limits.sql` | Agrega tabla `api_rate_limits` y función `claim_api_rate_limit`. Ya incluido en `000`. |

## Qué ejecutar para un entorno nuevo

```sql
-- En Supabase SQL Editor con rol administrativo:
-- Solo ejecutar este archivo:
lib/supabase/000_production_full_schema.sql
```

Movidos aquí el 27 de abril de 2026 como parte de la limpieza de deuda técnica.
