-- HCE Multiespecialidad: esquema inicial + RLS estricto por doctor_id/clinic_id.
-- Requiere ejecutar en Supabase SQL Editor con rol administrativo.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  doctor_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  specialty text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, doctor_id)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  doctor_id uuid not null references auth.users (id) on delete cascade,
  document_number text not null,
  full_name text not null,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, document_number)
);

create table if not exists public.clinical_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  doctor_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  chief_complaint text not null,
  cie_codes text[] not null default '{}',
  specialty_kind text not null,
  specialty_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.specialty_data (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  doctor_id uuid not null references auth.users (id) on delete cascade,
  clinical_record_id uuid not null references public.clinical_records (id) on delete cascade,
  specialty_kind text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  clinic_id uuid not null,
  doctor_id uuid not null references auth.users (id) on delete set null,
  event_type text not null,
  resource_type text not null,
  resource_id uuid not null,
  changes jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  entry_hash text not null,
  sequence_no bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_patients_tenant on public.patients (clinic_id, doctor_id);
create index if not exists idx_records_tenant on public.clinical_records (clinic_id, doctor_id);
create index if not exists idx_specialty_tenant on public.specialty_data (clinic_id, doctor_id);
create index if not exists idx_audit_tenant_time on public.audit_logs (clinic_id, doctor_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.clinical_records enable row level security;
alter table public.specialty_data enable row level security;
alter table public.audit_logs enable row level security;

-- Politicas: cada acceso exige uid autenticado + coincidencia doctor_id y clinic_id.
create policy "profiles_tenant_select"
  on public.profiles
  for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "profiles_tenant_write"
  on public.profiles
  for all
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "patients_tenant_select"
  on public.patients
  for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "patients_tenant_write"
  on public.patients
  for all
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "records_tenant_select"
  on public.clinical_records
  for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "records_tenant_write"
  on public.clinical_records
  for all
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "specialty_tenant_select"
  on public.specialty_data
  for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "specialty_tenant_write"
  on public.specialty_data
  for all
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "audit_tenant_insert"
  on public.audit_logs
  for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "audit_tenant_select"
  on public.audit_logs
  for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "audit_no_update"
  on public.audit_logs
  as restrictive
  for update
  to authenticated
  using (false);

create policy "audit_no_delete"
  on public.audit_logs
  as restrictive
  for delete
  to authenticated
  using (false);

create or replace function public.bump_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.bump_updated_at();

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.bump_updated_at();

drop trigger if exists trg_records_updated_at on public.clinical_records;
create trigger trg_records_updated_at
before update on public.clinical_records
for each row execute function public.bump_updated_at();

drop trigger if exists trg_specialty_updated_at on public.specialty_data;
create trigger trg_specialty_updated_at
before update on public.specialty_data
for each row execute function public.bump_updated_at();

create or replace function public.log_audit_event(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_event_type text,
  p_resource_type text,
  p_resource_id uuid,
  p_changes jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_prev_hash text;
  v_seq bigint;
  v_new_hash text;
  v_id bigint;
begin
  select entry_hash, sequence_no
    into v_prev_hash, v_seq
  from public.audit_logs
  where clinic_id = p_clinic_id and doctor_id = p_doctor_id
  order by id desc
  limit 1;

  v_prev_hash := coalesce(v_prev_hash, 'genesis');
  v_seq := coalesce(v_seq, 0) + 1;

  v_new_hash := encode(
    digest(
      v_prev_hash || '|' ||
      p_clinic_id::text || '|' ||
      p_doctor_id::text || '|' ||
      p_event_type || '|' ||
      p_resource_type || '|' ||
      p_resource_id::text || '|' ||
      p_changes::text || '|' ||
      now()::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.audit_logs (
    clinic_id,
    doctor_id,
    event_type,
    resource_type,
    resource_id,
    changes,
    metadata,
    previous_hash,
    entry_hash,
    sequence_no
  )
  values (
    p_clinic_id,
    p_doctor_id,
    p_event_type,
    p_resource_type,
    p_resource_id,
    p_changes,
    p_metadata,
    v_prev_hash,
    v_new_hash,
    v_seq
  )
  returning id into v_id;

  return v_id;
end;
$$;
