-- Migración 006: Plantillas Dinámicas de Tratamiento (Rompecabezas)

begin;

-- ============================================================
-- 1. TABLA TREATMENT TEMPLATES
-- ============================================================

create table if not exists public.clinical_form_templates (
  id          uuid        primary key default gen_random_uuid(),
  clinic_id   uuid        not null references public.clinics (id) on delete cascade,
  doctor_id   uuid        references auth.users (id) on delete set null,
  name        text        not null,
  description text,
  schema      jsonb       not null default '[]'::jsonb,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 2. POLÍTICAS RLS
-- ============================================================

alter table public.clinical_form_templates enable row level security;

drop policy if exists "tenant_isolation_clinical_form_templates" on public.clinical_form_templates;
create policy "tenant_isolation_clinical_form_templates"
  on public.clinical_form_templates
  for all
  to authenticated
  using (
    clinic_id = any (public.get_user_clinic_ids())
  )
  with check (
    clinic_id = any (public.get_user_clinic_ids())
  );

create index if not exists idx_clinical_form_templates_tenant on public.clinical_form_templates (clinic_id);

-- ============================================================
-- 3. AUDITORÍA
-- ============================================================

drop trigger if exists clinical_form_templates_audit on public.clinical_form_templates;
create trigger clinical_form_templates_audit
  after insert or update or delete on public.clinical_form_templates
  for each row execute function public.log_audit_event_trigger();

commit;
