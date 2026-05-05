# Supabase schema workflow

The project keeps a single SQL file as the source of truth.

## Source of truth
- src/lib/supabase/000_production_full_schema.sql

## Sync script
Run this to keep the single migration file in sync:

```bash
npm run db:schema:sync
```

## Notes
- Edit only the source file above.
- The migration file is a synchronized copy used for deployment/apply steps.
