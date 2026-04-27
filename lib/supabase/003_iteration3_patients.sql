-- Migración Iteración 3: Profesionalización del flujo clínico de pacientes
-- Agrega estado a los pacientes y se asegura del campo specialty_data en records.

begin;

alter table if exists public.patients
  add column if not exists status text not null default 'activo';

alter table if exists public.patients
  drop constraint if exists patients_status_check;

alter table if exists public.patients
  add constraint patients_status_check
  check (status in ('activo', 'inactivo', 'en-seguimiento', 'alta'));

alter table if exists public.clinical_records
  add column if not exists specialty_data jsonb not null default '{}'::jsonb;

-- Forzar refresco de caché del schema de postgREST
NOTIFY pgrst, 'reload schema';

commit;
