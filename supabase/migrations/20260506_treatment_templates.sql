-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: treatment_templates
--
-- Moves treatment template storage from localStorage (single-device, lossy)
-- to a Supabase table (multi-device, persistent, RLS-protected).
--
-- versions is a JSONB array of { version, notes, updated_at } snapshots.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.treatment_templates (
  id                uuid        primary key default gen_random_uuid(),
  doctor_id         uuid        not null references auth.users (id) on delete cascade,
  clinic_id         uuid        not null,
  trigger           text        not null,
  title             text        not null,
  treatment         text        not null,
  current_version   integer     not null default 1,
  versions          jsonb       not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index for fast lookups by clinic
create index if not exists treatment_templates_clinic_idx
  on public.treatment_templates (clinic_id, doctor_id);

-- Auto-update updated_at on any row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists treatment_templates_updated_at on public.treatment_templates;
create trigger treatment_templates_updated_at
  before update on public.treatment_templates
  for each row execute function public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.treatment_templates enable row level security;

-- Doctors can only see their own templates
create policy "treatment_templates: select own"
  on public.treatment_templates for select
  using (auth.uid() = doctor_id);

-- Doctors can only insert their own templates
create policy "treatment_templates: insert own"
  on public.treatment_templates for insert
  with check (auth.uid() = doctor_id);

-- Doctors can only update their own templates
create policy "treatment_templates: update own"
  on public.treatment_templates for update
  using (auth.uid() = doctor_id);

-- Doctors can only delete their own templates
create policy "treatment_templates: delete own"
  on public.treatment_templates for delete
  using (auth.uid() = doctor_id);
