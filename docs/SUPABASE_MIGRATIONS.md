# Base de Datos — Guía de Trabajo

## Principio fundamental

> **Un solo archivo SQL.** Toda la definición de la base de datos vive en:
> `supabase/migrations/000_production_full_schema.sql`

No se crean archivos de migración separados. Ese archivo es la fuente de verdad.

---

## Flujo: añadir o modificar una tabla

```
1. Editar el SQL  →  2. Aplicar en Supabase  →  3. Regenerar tipos  →  4. Commit
```

### 1. Editar `000_production_full_schema.sql`

Añade tu tabla, índice, función o política siguiendo las reglas del archivo:

- **Tablas** → `CREATE TABLE IF NOT EXISTS`
- **Índices** → `CREATE INDEX IF NOT EXISTS`
- **Funciones** → `CREATE OR REPLACE FUNCTION`
- **Políticas RLS** → `DROP POLICY IF EXISTS` + `CREATE POLICY`
- **Triggers** → `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`

El archivo es **idempotente** — se puede re-ejecutar sin romper datos existentes.

### 2. Aplicar en Supabase

Ve a **Supabase → SQL Editor** → pega el archivo completo → **Run**.

Es seguro ejecutarlo sobre una BD que ya tiene datos. Solo aplicará lo que falta.

### 3. Regenerar los tipos TypeScript

```bash
npm run db:types
```

Esto llama a la Management API de Supabase y sobreescribe `src/types/supabase.types.ts`
con los tipos actualizados de todas las tablas.

> **Requiere:** `SUPABASE_ACCESS_TOKEN=sbp_xxxx` en `.env.local`  
> Obtener en: [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)  
> Es un token personal de desarrollo — **no va en Vercel**.

### 4. Commit

```bash
git add supabase/migrations/000_production_full_schema.sql
git add src/types/supabase.types.ts
git commit -m "feat(db): add <nombre_tabla> table"
```

---

## Reglas del archivo SQL

| Regla | Por qué |
|-------|---------|
| Un solo archivo | Fácil de auditar, aplicar y versionar |
| Idempotente (`IF NOT EXISTS`, `CREATE OR REPLACE`) | Se puede re-ejecutar sin miedo |
| Cada tabla con comentario de propósito | Documentación viva en la BD |
| RLS habilitado en todas las tablas | Seguridad por defecto — ningún dato expuesto sin política |
| Triggers de `updated_at` usando `bump_updated_at()` | Consistencia — no depende de la app |

---

## Variables de entorno relacionadas

| Variable | Dónde | Para qué |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Local + Vercel | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local + Vercel | Clave pública del cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Local + Vercel | Clave de servidor (webhooks, admin) |
| `SUPABASE_ACCESS_TOKEN` | Solo local | Regenerar tipos con `npm run db:types` |

---

## Checklist al añadir una tabla nueva

- [ ] Tabla definida con `CREATE TABLE IF NOT EXISTS`
- [ ] `doctor_id uuid references auth.users(id) on delete cascade`
- [ ] `created_at` y `updated_at` con `default now()`
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [ ] Políticas RLS para SELECT e INSERT/UPDATE/DELETE
- [ ] Trigger `bump_updated_at()` registrado
- [ ] Índice en `(clinic_id, doctor_id)` si aplica
- [ ] `npm run db:types` ejecutado y `supabase.types.ts` commiteado
