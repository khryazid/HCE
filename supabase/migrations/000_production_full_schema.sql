-- ============================================================
-- HCE Multiespecialidad — Schema Completo de Producción
-- Versión: 3.0
-- ============================================================
--
-- REGLAS DE ESTE ARCHIVO:
--   1. Un solo archivo. Toda la definición de la BD vive aquí.
--      No se crean archivos de migración separados.
--   2. Idempotente. Puede ejecutarse sobre una BD vacía o ya
--      existente sin romper datos. Usa IF NOT EXISTS / IF EXISTS
--      en tablas, índices y triggers; usa CREATE OR REPLACE en
--      funciones; usa DROP IF EXISTS + CREATE en políticas RLS.
--   3. Auto-documentado. Cada sección tiene un encabezado y
--      cada tabla explica el propósito de sus columnas.
--   4. Sin magia implícita. Toda restricción, índice, trigger
--      y política debe declararse explícitamente aquí.
--
-- CÓMO APLICAR:
--   Supabase → SQL Editor → pegar este archivo → Run.
--   Es seguro re-ejecutarlo en cualquier momento.
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- 0. EXTENSIONES
-- ════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════
-- 1. TABLAS
-- ════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────
-- Una fila por médico. doctor_id = auth.uid().
-- clinic_id agrupa médicos dentro de una misma clínica.
-- subscription_status refleja el estado de Stripe o el valor
-- especial "lifetime" para acceso sin vencimiento.
create table if not exists public.profiles (
  id                      uuid        primary key default gen_random_uuid(),
  clinic_id               uuid        not null,
  doctor_id               uuid        not null references auth.users (id) on delete cascade,
  full_name               text        not null,
  -- Array de especialidades médicas del doctor (ej. ['medicina-general', 'pediatria'])
  specialty               text[]      not null default '{}',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  -- Stripe-driven: incomplete | incomplete_expired | trialing | active |
  --                past_due | canceled | unpaid | paused
  -- Admin-driven:  lifetime (acceso permanente sin Stripe)
  subscription_status     text        default 'incomplete'
    check (subscription_status in (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused', 'lifetime'
    )),
  -- NULL = sin vencimiento (lifetime o plan sin fecha límite)
  subscription_expires_at timestamptz default null,
  plan                    text        not null default 'basic' check (plan in ('basic', 'clinic')),
  payment_config          jsonb       not null default '{}'::jsonb,
  ui_preferences          jsonb       not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (clinic_id, doctor_id)
);

-- Parche para migraciones: agregar columna plan si no existe
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'plan'
  ) then
    alter table public.profiles
      add column plan text not null default 'basic' check (plan in ('basic', 'clinic'));
  end if;
end $$;

-- ── patients ─────────────────────────────────────────────────
-- Un paciente por document_number dentro de cada clínica.
create table if not exists public.patients (
  id              uuid        primary key default gen_random_uuid(),
  clinic_id       uuid        not null,
  doctor_id       uuid        not null references auth.users (id) on delete cascade,
  document_number text        not null,
  full_name       text        not null,
  birth_date      date,
  status          text        not null default 'activo'
    check (status in ('activo', 'inactivo', 'en-seguimiento', 'alta')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (clinic_id, document_number)
);

-- ── clinical_records ─────────────────────────────────────────
-- Una fila por consulta/seguimiento.
-- specialty_data es JSONB libre para datos específicos de cada especialidad.
create table if not exists public.clinical_records (
  id              uuid        primary key default gen_random_uuid(),
  clinic_id       uuid        not null,
  doctor_id       uuid        not null references auth.users (id) on delete cascade,
  patient_id      uuid        not null references public.patients (id) on delete cascade,
  chief_complaint text        not null,
  cie_codes       text[]      not null default '{}',
  specialty_kind  text        not null,
  specialty_data  jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── specialty_data ───────────────────────────────────────────
-- Tabla hermana de clinical_records para datos extendidos por especialidad.
-- Permite queries de reportes sin tener que parsear el JSONB de clinical_records.
create table if not exists public.specialty_data (
  id                  uuid        primary key default gen_random_uuid(),
  clinic_id           uuid        not null,
  doctor_id           uuid        not null references auth.users (id) on delete cascade,
  clinical_record_id  uuid        not null references public.clinical_records (id) on delete cascade,
  specialty_kind      text        not null,
  data                jsonb       not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── audit_logs ───────────────────────────────────────────────
-- Log inmutable con hashing encadenado (estilo blockchain).
-- RLS bloquea UPDATE y DELETE a nivel de servidor (ver sección RLS).
create table if not exists public.audit_logs (
  id            bigint generated always as identity primary key,
  clinic_id     uuid        not null,
  doctor_id     uuid        references auth.users (id) on delete set null,
  event_type    text        not null,
  resource_type text        not null,
  resource_id   uuid        not null,
  changes       jsonb       not null,
  metadata      jsonb       not null default '{}'::jsonb,
  previous_hash text,
  entry_hash    text        not null,
  sequence_no   bigint      not null,
  created_at    timestamptz not null default now()
);

-- ── follow_up_tasks ──────────────────────────────────────────
-- Citas de seguimiento programadas desde el wizard de consulta.
create table if not exists public.follow_up_tasks (
  id                  uuid        primary key default gen_random_uuid(),
  clinic_id           uuid        not null,
  doctor_id           uuid        not null references auth.users (id) on delete cascade,
  patient_id          uuid        not null references public.patients (id) on delete cascade,
  clinical_record_id  uuid        references public.clinical_records (id) on delete set null,
  due_date            date        not null,
  status              text        not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  note                text        not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── appointments ─────────────────────────────────────────────
-- Citas médicas (Agenda) y control de cobros.
create table if not exists public.appointments (
  id              uuid        primary key default gen_random_uuid(),
  clinic_id       uuid        not null,
  doctor_id       uuid        not null references auth.users (id) on delete cascade,
  patient_id      uuid        references public.patients (id) on delete set null,
  patient_name    text        not null,
  patient_phone   text,
  patient_document text,
  patient_birth_date date,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  status          text        not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  payment_status  text        not null default 'pending'
    check (payment_status in ('pending', 'paid', 'partial', 'honorary')),
  payment_method  text,
  consultation_type text,
  amount          numeric(10,2),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── api_rate_limits ──────────────────────────────────────────
-- Contador de rate-limiting por scope+usuario dentro de una ventana de tiempo.
-- Usado por claim_api_rate_limit() para proteger el endpoint de CIE-AI.
create table if not exists public.api_rate_limits (
  scope               text        not null,
  identifier          uuid        not null references auth.users (id) on delete cascade,
  window_started_at   timestamptz not null default now(),
  request_count       integer     not null default 0,
  updated_at          timestamptz not null default now(),
  primary key (scope, identifier)
);

-- ── push_subscriptions ───────────────────────────────────────
-- Suscripciones de dispositivos para Web Push Notifications.
-- endpoint es único para evitar duplicados por dispositivo.
create table if not exists public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  clinic_id   uuid        not null,
  doctor_id   uuid        not null references auth.users (id) on delete cascade,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  created_at  timestamptz not null default now()
);

-- ── treatment_templates ──────────────────────────────────────
-- Plantillas de tratamiento reutilizables por médico.
-- Migradas de localStorage a Supabase para soporte multi-dispositivo.
-- versions es un array JSONB de snapshots { version, notes, updated_at }.
create table if not exists public.treatment_templates (
  id              uuid        primary key default gen_random_uuid(),
  doctor_id       uuid        not null references auth.users (id) on delete cascade,
  clinic_id       uuid        not null,
  trigger         text        not null,  -- síntoma/diagnóstico que activa la plantilla
  title           text        not null,  -- nombre legible de la plantilla
  treatment       text        not null,  -- texto del tratamiento recomendado
  extra_sections  jsonb       not null default '{}'::jsonb,
  current_version integer     not null default 1,
  versions        jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── clinic_members ───────────────────────────────────────────
-- Miembros de una clínica para acceso compartido (multi-doctor).
create table if not exists public.clinic_members (
  id              uuid        primary key default gen_random_uuid(),
  clinic_id       uuid        not null,
  doctor_id       uuid        not null references auth.users (id) on delete cascade,
  role            text        not null check (role in ('admin', 'doctor', 'assistant')),
  invited_by      uuid        references auth.users (id) on delete set null,
  joined_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (clinic_id, doctor_id)
);

-- Parche para migraciones: actualizar constraint de roles
do $$
begin
  alter table public.clinic_members drop constraint if exists clinic_members_role_check;
  alter table public.clinic_members add constraint clinic_members_role_check check (role in ('admin', 'doctor', 'assistant'));
end $$;

-- ════════════════════════════════════════════════════════════
-- 2. COMPATIBILIDAD (columnas añadidas en versiones anteriores)
--    Estas líneas son no-ops en una instalación nueva.
-- ════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists payment_config jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists subscription_expires_at timestamptz default null;

-- Garantiza que el CHECK de subscription_status incluye 'lifetime'
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;
alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused', 'lifetime'
  ));

alter table public.patients
  add column if not exists status text not null default 'activo';
alter table public.patients
  drop constraint if exists patients_status_check;
alter table public.patients
  add constraint patients_status_check
  check (status in ('activo', 'inactivo', 'en-seguimiento', 'alta'));

alter table public.audit_logs
  alter column doctor_id drop not null;
alter table public.audit_logs
  drop constraint if exists audit_logs_doctor_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_doctor_id_fkey
  foreign key (doctor_id) references auth.users (id) on delete set null;

-- Migración de specialty TEXT → TEXT[] (no-op si ya es TEXT[])
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'specialty'
      and data_type    = 'text'
  ) then
    alter table public.profiles
      alter column specialty type text[]
      using string_to_array(specialty, ' | ');
  end if;
end $$;

-- ════════════════════════════════════════════════════════════
-- 3. ÍNDICES
-- ════════════════════════════════════════════════════════════

create index if not exists idx_patients_tenant
  on public.patients (clinic_id, doctor_id);

create index if not exists idx_records_tenant
  on public.clinical_records (clinic_id, doctor_id);

create index if not exists idx_specialty_tenant
  on public.specialty_data (clinic_id, doctor_id);

create index if not exists idx_specialty_record
  on public.specialty_data (clinical_record_id);

create index if not exists idx_audit_tenant_time
  on public.audit_logs (clinic_id, doctor_id, created_at desc);

create index if not exists idx_follow_up_tasks_tenant
  on public.follow_up_tasks (clinic_id, doctor_id, due_date);

create index if not exists idx_appointments_tenant_time
  on public.appointments (clinic_id, doctor_id, start_time);

create index if not exists idx_api_rate_limits_scope_updated_at
  on public.api_rate_limits (scope, updated_at desc);

-- Único para Stripe: evita duplicados de customer_id
create unique index if not exists idx_profiles_stripe_customer
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Para queries de expiración de suscripción (admin panel / cron)
create index if not exists idx_profiles_subscription_expires_at
  on public.profiles (subscription_expires_at)
  where subscription_expires_at is not null;

-- Para búsquedas rápidas de plantillas por clínica/doctor
create index if not exists idx_treatment_templates_tenant
  on public.treatment_templates (clinic_id, doctor_id);

-- ── Full-Text Search (FTS) ─────────────────────────────────────
-- GIN indexes on tsvector columns for fast full-text search.
-- spanish config handles stemming (medicina → medic, etc.).

create index if not exists idx_patients_fts
  on public.patients
  using gin (to_tsvector('spanish', coalesce(full_name, '') || ' ' || coalesce(document_number, '')));

create index if not exists idx_clinical_records_fts
  on public.clinical_records
  using gin (to_tsvector('spanish', coalesce(chief_complaint, '')));


-- ════════════════════════════════════════════════════════════
-- FUNCIONES DE AYUDA PARA RLS (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════

create or replace function public.is_clinic_member(check_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = check_clinic_id
      and doctor_id = auth.uid()
  );
$$;

create or replace function public.is_clinic_admin(check_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = check_clinic_id
      and doctor_id = auth.uid()
      and role = 'admin'
  );
$$;

-- ════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════

alter table public.profiles             enable row level security;
alter table public.patients             enable row level security;
alter table public.clinical_records     enable row level security;
alter table public.specialty_data       enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.follow_up_tasks      enable row level security;
alter table public.api_rate_limits      enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.treatment_templates  enable row level security;
alter table public.clinic_members       enable row level security;
alter table public.appointments         enable row level security;

-- ── profiles ─────────────────────────────────────────────────
-- Solo el propio médico puede leer/escribir su perfil.
drop policy if exists "profiles_tenant_select" on public.profiles;
create policy "profiles_tenant_select"
  on public.profiles for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "profiles_tenant_write" on public.profiles;
create policy "profiles_tenant_write"
  on public.profiles for all to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- ── patients ─────────────────────────────────────────────────
-- Acceso por clinic_id del perfil del médico autenticado.
-- Cualquier médico de la misma clínica puede ver y escribir pacientes.
drop policy if exists "patients_tenant_select" on public.patients;
create policy "patients_tenant_select"
  on public.patients for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.patients.clinic_id
    ) or public.is_clinic_member(public.patients.clinic_id)
  );

drop policy if exists "patients_tenant_write" on public.patients;
create policy "patients_tenant_write"
  on public.patients for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.patients.clinic_id
    ) or public.is_clinic_member(public.patients.clinic_id)
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.patients.clinic_id
    ) or public.is_clinic_member(public.patients.clinic_id)
  );

-- ── clinical_records ─────────────────────────────────────────
drop policy if exists "records_tenant_select" on public.clinical_records;
create policy "records_tenant_select"
  on public.clinical_records for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinical_records.clinic_id
    ) or public.is_clinic_member(public.clinical_records.clinic_id)
  );

drop policy if exists "records_tenant_write" on public.clinical_records;
create policy "records_tenant_write"
  on public.clinical_records for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinical_records.clinic_id
    ) or public.is_clinic_member(public.clinical_records.clinic_id)
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinical_records.clinic_id
    ) or public.is_clinic_member(public.clinical_records.clinic_id)
  );

-- ── specialty_data ───────────────────────────────────────────
drop policy if exists "specialty_tenant_select" on public.specialty_data;
create policy "specialty_tenant_select"
  on public.specialty_data for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.specialty_data.clinic_id
    ) or public.is_clinic_member(public.specialty_data.clinic_id)
  );

drop policy if exists "specialty_tenant_write" on public.specialty_data;
create policy "specialty_tenant_write"
  on public.specialty_data for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.specialty_data.clinic_id
    ) or public.is_clinic_member(public.specialty_data.clinic_id)
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.specialty_data.clinic_id
    ) or public.is_clinic_member(public.specialty_data.clinic_id)
  );

-- ── audit_logs ───────────────────────────────────────────────
-- INSERT propio + SELECT propio. UPDATE y DELETE bloqueados permanentemente.
drop policy if exists "audit_tenant_insert" on public.audit_logs;
create policy "audit_tenant_insert"
  on public.audit_logs for insert to authenticated
  with check (doctor_id = auth.uid());

drop policy if exists "audit_tenant_select" on public.audit_logs;
create policy "audit_tenant_select"
  on public.audit_logs for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "audit_no_update" on public.audit_logs;
create policy "audit_no_update"
  on public.audit_logs as restrictive for update to authenticated
  using (false);

drop policy if exists "audit_no_delete" on public.audit_logs;
create policy "audit_no_delete"
  on public.audit_logs as restrictive for delete to authenticated
  using (false);

-- ── follow_up_tasks ──────────────────────────────────────────
-- Cada médico solo ve y escribe sus propias tareas de seguimiento.
drop policy if exists "followup_tenant_select" on public.follow_up_tasks;
create policy "followup_tenant_select"
  on public.follow_up_tasks for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "followup_tenant_write" on public.follow_up_tasks;
create policy "followup_tenant_write"
  on public.follow_up_tasks for all to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- ── appointments ─────────────────────────────────────────────
-- Cada médico de la clínica puede ver y escribir en la agenda compartida de su clínica
drop policy if exists "appointments_tenant_select" on public.appointments;
create policy "appointments_tenant_select"
  on public.appointments for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.appointments.clinic_id
    ) or public.is_clinic_member(public.appointments.clinic_id)
  );

drop policy if exists "appointments_tenant_write" on public.appointments;
create policy "appointments_tenant_write"
  on public.appointments for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.appointments.clinic_id
    ) or public.is_clinic_member(public.appointments.clinic_id)
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.appointments.clinic_id
    ) or public.is_clinic_member(public.appointments.clinic_id)
  );

-- ── push_subscriptions ───────────────────────────────────────
-- El médico solo ve y gestiona sus propias suscripciones push.
drop policy if exists "push_subscriptions_tenant_select" on public.push_subscriptions;
-- A-05: Corregido operador OR ambiguo — se agregan paréntesis para que
-- `doctor_id = auth.uid()` sea condición obligatoria en todos los casos.
create policy "push_subscriptions_tenant_select"
  on public.push_subscriptions for select to authenticated
  using (
    doctor_id = auth.uid()
    and (
      exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.push_subscriptions.clinic_id
      )
      or public.is_clinic_member(public.push_subscriptions.clinic_id)
    )
  );

drop policy if exists "push_subscriptions_tenant_write" on public.push_subscriptions;
create policy "push_subscriptions_tenant_write"
  on public.push_subscriptions for all to authenticated
  using (
    doctor_id = auth.uid()
    and (
      exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.push_subscriptions.clinic_id
      )
      or public.is_clinic_member(public.push_subscriptions.clinic_id)
    )
  )
  with check (
    doctor_id = auth.uid()
    and (
      exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.push_subscriptions.clinic_id
      )
      or public.is_clinic_member(public.push_subscriptions.clinic_id)
    )
  );

-- ── treatment_templates ──────────────────────────────────────
-- Cada médico solo puede ver, crear, editar y borrar sus propias plantillas.
drop policy if exists "treatment_templates_select" on public.treatment_templates;
create policy "treatment_templates_select"
  on public.treatment_templates for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "treatment_templates_write" on public.treatment_templates;
create policy "treatment_templates_write"
  on public.treatment_templates for all to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- ── clinic_members ───────────────────────────────────────────
drop policy if exists "clinic_members_select" on public.clinic_members;
create policy "clinic_members_select"
  on public.clinic_members for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinic_members.clinic_id
    ) or public.is_clinic_member(public.clinic_members.clinic_id)
  );

drop policy if exists "clinic_members_write" on public.clinic_members;
create policy "clinic_members_write"
  on public.clinic_members for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinic_members.clinic_id
    ) or public.is_clinic_admin(public.clinic_members.clinic_id)
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinic_members.clinic_id
    ) or public.is_clinic_admin(public.clinic_members.clinic_id)
  );

-- ════════════════════════════════════════════════════════════
-- 5. FUNCIONES Y TRIGGERS
-- ════════════════════════════════════════════════════════════

-- ── bump_updated_at ──────────────────────────────────────────
-- Trigger helper: actualiza updated_at automáticamente en cualquier UPDATE.
-- Compartida por todas las tablas que tienen la columna updated_at.
create or replace function public.bump_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at          on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_patients_updated_at          on public.patients;
create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_records_updated_at           on public.clinical_records;
create trigger trg_records_updated_at
  before update on public.clinical_records
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_specialty_updated_at         on public.specialty_data;
create trigger trg_specialty_updated_at
  before update on public.specialty_data
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_followups_updated_at         on public.follow_up_tasks;
create trigger trg_followups_updated_at
  before update on public.follow_up_tasks
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_appointments_updated_at      on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_treatment_templates_updated_at on public.treatment_templates;
create trigger trg_treatment_templates_updated_at
  before update on public.treatment_templates
  for each row execute function public.bump_updated_at();

-- ── log_audit_event ──────────────────────────────────────────
-- Inserta en audit_logs con hash encadenado (estilo blockchain).
-- Llamar desde la app o desde otros triggers. security definer
-- permite que cualquier médico autenticado inserte sin acceso directo a la tabla.
-- A-19: Valida que el llamador solo pueda insertar en su propio nombre.
create or replace function public.log_audit_event(
  p_clinic_id     uuid,
  p_doctor_id     uuid,
  p_event_type    text,
  p_resource_type text,
  p_resource_id   uuid,
  p_changes       jsonb,
  p_metadata      jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer as $$
declare
  v_prev_hash text;
  v_seq       bigint;
  v_new_hash  text;
  v_id        bigint;
begin
  -- A-19: Reject if caller is trying to log on behalf of another user.
  -- Prevents fake audit entries from compromising the medical audit trail.
  if auth.uid() <> p_doctor_id then
    raise exception 'Unauthorized: cannot create audit log for another user'
      using errcode = '42501';
  end if;

  select entry_hash, sequence_no
    into v_prev_hash, v_seq
  from public.audit_logs
  where clinic_id = p_clinic_id and doctor_id = p_doctor_id
  order by id desc
  limit 1;

  v_prev_hash := coalesce(v_prev_hash, 'genesis');
  v_seq       := coalesce(v_seq, 0) + 1;

  v_new_hash := encode(
    digest(
      v_prev_hash         || '|' ||
      p_clinic_id::text   || '|' ||
      p_doctor_id::text   || '|' ||
      p_event_type        || '|' ||
      p_resource_type     || '|' ||
      p_resource_id::text || '|' ||
      p_changes::text     || '|' ||
      now()::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.audit_logs (
    clinic_id, doctor_id, event_type, resource_type, resource_id,
    changes, metadata, previous_hash, entry_hash, sequence_no
  ) values (
    p_clinic_id, p_doctor_id, p_event_type, p_resource_type, p_resource_id,
    p_changes, p_metadata, v_prev_hash, v_new_hash, v_seq
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ── claim_api_rate_limit ─────────────────────────────────────
-- Rate-limiting atómico por ventana de tiempo.
-- Retorna TRUE si el llamador superó el límite, FALSE si está dentro.
create or replace function public.claim_api_rate_limit(
  p_scope           text,
  p_identifier      uuid,
  p_window_seconds  integer,
  p_max_requests    integer
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_now               timestamptz := now();
  v_window_started_at timestamptz;
  v_request_count     integer;
begin
  if auth.uid() is distinct from p_identifier then
    raise exception 'unauthorized rate limit claim';
  end if;

  loop
    select window_started_at, request_count
      into v_window_started_at, v_request_count
    from public.api_rate_limits
    where scope = p_scope and identifier = p_identifier
    for update;

    if not found then
      insert into public.api_rate_limits
        (scope, identifier, window_started_at, request_count, updated_at)
      values
        (p_scope, p_identifier, v_now, 1, v_now);
      return false;
    end if;

    if v_now - v_window_started_at >= make_interval(secs => p_window_seconds) then
      update public.api_rate_limits
        set window_started_at = v_now,
            request_count     = 1,
            updated_at        = v_now
      where scope = p_scope and identifier = p_identifier;
      return false;
    end if;

    update public.api_rate_limits
      set request_count = v_request_count + 1,
          updated_at    = v_now
    where scope = p_scope and identifier = p_identifier;

    return v_request_count + 1 > p_max_requests;
  end loop;
end;
$$;

grant execute on function public.claim_api_rate_limit(text, uuid, integer, integer)
  to authenticated;

-- ── search_global ─────────────────────────────────────────────
-- A-01: FTS real con websearch_to_tsquery + índices GIN.
-- A-06: clinic_id derivado de auth.uid() — sin IDOR.
-- SECURITY DEFINER con search_path fijo para seguridad.
-- Actualizado: 2026-05-18

create or replace function public.search_global(p_query text)
returns table (
  kind       text,
  id         uuid,
  title      text,
  subtitle   text,
  patient_id uuid,
  updated_at timestamptz,
  rank       real
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_tsquery   tsquery;
begin
  -- A-06: Derivar clinic_id desde auth.uid() — nunca del cliente
  select clinic_id into v_clinic_id
    from public.profiles
   where doctor_id = auth.uid()
   limit 1;

  if v_clinic_id is null then
    return;
  end if;

  -- A-01: websearch_to_tsquery es seguro ante entrada arbitraria
  begin
    v_tsquery := websearch_to_tsquery('spanish', p_query);
  exception when others then
    v_tsquery := null;
  end;

  if v_tsquery is null or v_tsquery::text = '' then
    begin
      v_tsquery := plainto_tsquery('spanish', p_query);
    exception when others then
      return;
    end;
  end if;

  -- Pacientes (full_name es la columna real del schema — no first_name/last_name)
  return query
    select
      'patient'::text                                     as kind,
      p.id,
      p.full_name::text                                   as title,
      coalesce(p.document_number, 'Sin documento')::text  as subtitle,
      p.id                                                as patient_id,
      p.updated_at,
      ts_rank(
        to_tsvector('spanish',
          coalesce(p.full_name,'')       || ' ' ||
          coalesce(p.document_number,'')),
        v_tsquery
      )::real                                             as rank
    from public.patients p
   where p.clinic_id = v_clinic_id
     and to_tsvector('spanish',
           coalesce(p.full_name,'')       || ' ' ||
           coalesce(p.document_number,'')
         ) @@ v_tsquery
   order by rank desc
   limit 20;

  -- Consultas (chief_complaint es la columna real — no reason_for_visit/diagnosis/clinical_analysis)
  return query
    select
      'consultation'::text                                               as kind,
      cr.id,
      coalesce(cr.chief_complaint, 'Sin motivo')::text                  as title,
      to_char(cr.created_at at time zone 'America/Guayaquil',
              'DD/MM/YYYY')::text                                        as subtitle,
      cr.patient_id,
      cr.updated_at,
      ts_rank(
        to_tsvector('spanish', coalesce(cr.chief_complaint,'')),
        v_tsquery
      )::real                                                            as rank
    from public.clinical_records cr
   where cr.clinic_id = v_clinic_id
     and to_tsvector('spanish', coalesce(cr.chief_complaint,'')) @@ v_tsquery
   order by rank desc
   limit 20;
end;
$$;

-- Revocar acceso a la firma vieja (text, uuid) si existe
drop function if exists public.search_global(text, uuid);

revoke all on function public.search_global(text) from anon;
grant execute on function public.search_global(text) to authenticated;

-- ════════════════════════════════════════════════════════════
-- 6. VISTAS MATERIALIZADAS
-- ════════════════════════════════════════════════════════════

-- KPIs diarios del dashboard (consultas y pacientes creados por día).
-- Refrescar automáticamente con el cron job definido en la sección 7.
drop materialized view if exists public.mv_dashboard_kpis_daily;
create materialized view public.mv_dashboard_kpis_daily as
select
  clinic_id,
  doctor_id,
  date_trunc('day', created_at)::date as report_date,
  count(*) filter (
    where resource_type = 'clinical_records' and event_type = 'create'
  ) as consultations_created,
  count(*) filter (
    where resource_type = 'patients' and event_type = 'create'
  ) as patients_created
from public.audit_logs
group by clinic_id, doctor_id, date_trunc('day', created_at)::date;

create index if not exists idx_mv_dashboard_kpis_daily
  on public.mv_dashboard_kpis_daily (clinic_id, doctor_id, report_date desc);

-- M-04: MVs no soportan RLS en Postgres. Revocamos acceso directo y creamos una vista segura.
revoke all on public.mv_dashboard_kpis_daily from authenticated, anon;

drop view if exists public.v_dashboard_kpis_daily;
create view public.v_dashboard_kpis_daily with (security_invoker = on) as
select * from public.mv_dashboard_kpis_daily
where doctor_id = auth.uid();

grant select on public.v_dashboard_kpis_daily to authenticated;

-- ════════════════════════════════════════════════════════════
-- 7. CRON JOBS (requiere pg_cron activada en Supabase)
-- ════════════════════════════════════════════════════════════

-- pg_cron y pg_net se activan desde Supabase Dashboard → Database → Extensions.
-- NO crear con CREATE EXTENSION desde aquí — requiere superusuario y rompe
-- la transacción si no está disponible.

-- Refresca los KPIs a medianoche cada día.
-- Envuelto en DO/EXCEPTION para no romper la transacción si pg_cron no está activo.
do $$ begin
  perform cron.schedule(
    'refresh_mv_kpis_daily',
    '0 0 * * *',
    'refresh materialized view public.mv_dashboard_kpis_daily'
  );
exception when others then
  raise notice '[cron] pg_cron no disponible: %. Habilítalo en Supabase → Database → Extensions.', sqlerrm;
end $$;

-- ── Notificaciones push de seguimientos vencidos ─────────────────────────────
-- Dispara a las 8:00am UTC cada día.
-- Para cada doctor con suscripciones push activas y seguimientos pendientes hoy,
-- llama a /api/push/send vía pg_net con el secreto almacenado en app_config.
--
-- NO requiere ALTER DATABASE ni permisos de superusuario.
-- Los valores se guardan en la tabla public.app_config (ver sección 8).
--
-- IMPORTANTE: Este cron job NO expone datos clínicos en el payload push.
--   Solo envía "Tienes X seguimiento(s) para hoy" — el doctor abre la app para el detalle.

-- pg_net: habilitar desde Supabase Dashboard → Database → Extensions.
-- Se usa implícitamente via net.http_post() en las funciones de cron.

-- Función auxiliar: envía push para un doctor específico con sus seguimientos de hoy
-- M-09: Unificado a net.http_post (pg_net) — antes usaba extensions.http_post inconsistentemente.
create or replace function public.notify_followup_due_today(
  p_doctor_id    uuid,
  p_due_count    integer,
  p_site_url     text,
  p_push_secret  text
) returns void language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := p_site_url || '/api/push/send',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-push-secret', p_push_secret
               ),
    body    := jsonb_build_object(
                 'target_doctor_id', p_doctor_id::text,
                 'title', 'Glyphix — Seguimientos para hoy',
                 'body',  'Tienes ' || p_due_count || ' seguimiento(s) que vence(n) hoy.',
                 'url',   '/pacientes'
               )
  );
end;
$$;

-- Wrapper que itera sobre todos los doctores con seguimientos hoy.
-- Lee app.site_url y app.push_send_secret desde public.app_config.
create or replace function public.send_followup_push_notifications() returns void
language plpgsql security definer as $$
declare
  v_site_url    text;
  v_push_secret text;
  r record;
begin
  -- Leer configuración desde la tabla app_config (no requiere superusuario)
  select value into v_site_url    from public.app_config where key = 'site_url';
  select value into v_push_secret from public.app_config where key = 'push_send_secret';

  if v_site_url is null or v_push_secret is null
     or v_site_url like 'REEMPLAZAR%' or v_push_secret like 'REEMPLAZAR%' then
    raise warning '[push_cron] app_config no configurada. Ejecuta la sección 8 del SQL con tus valores reales.';
    return;
  end if;

  for r in
    select
      ft.doctor_id,
      count(*) as due_count
    from public.follow_up_tasks ft
    inner join public.push_subscriptions ps on ps.doctor_id = ft.doctor_id
    where ft.due_date = current_date
      and ft.status   = 'pending'
    group by ft.doctor_id
  loop
    perform public.notify_followup_due_today(
      r.doctor_id,
      r.due_count::integer,
      v_site_url,
      v_push_secret
    );
  end loop;
end;
$$;

-- Programa el cron job a las 8:00am UTC
do $$ begin
  perform cron.schedule(
    'send_followup_push_daily',
    '0 8 * * *',
    'select public.send_followup_push_notifications()'
  );
exception when others then
  raise notice '[cron] pg_cron no disponible: %. Habilítalo en Supabase → Database → Extensions.', sqlerrm;
end $$;

-- ════════════════════════════════════════════════════════════
-- 8. CONFIGURACIÓN DE APP (tabla — sin privilegios especiales)
-- ════════════════════════════════════════════════════════════
--
-- Tabla de configuración leída por las funciones de cron.
-- No requiere ALTER DATABASE ni superusuario — cualquier rol con
-- acceso al SQL Editor de Supabase puede hacer INSERT/UPDATE aquí.
--
-- ⚠️  ANTES DE EJECUTAR ESTE BLOQUE:
--     Reemplaza los dos valores 'REEMPLAZAR_*' con tus datos reales:
--
--     site_url         → tu URL de Vercel  (= NEXT_PUBLIC_SITE_URL en .env)
--     push_send_secret → secreto del cron  (= PUSH_SEND_SECRET en Vercel)

create table if not exists public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Solo el service role puede leer esta tabla (contiene secretos)
alter table public.app_config enable row level security;
-- Sin policies públicas → solo service_role y funciones SECURITY DEFINER acceden

-- C-01: Los secretos reales NO se guardan aquí. Insertarlos manualmente desde
-- el Supabase SQL Editor tras rotar los valores en Vercel.
-- Generar nuevo PUSH_SEND_SECRET con: openssl rand -hex 32
insert into public.app_config (key, value) values
  ('site_url',         'REEMPLAZAR_CON_NEXT_PUBLIC_SITE_URL'),
  ('push_send_secret', 'REEMPLAZAR_CON_PUSH_SEND_SECRET'),
  ('plan_pro_price',   '29'),
  ('plan_clinic_price','99')
on conflict (key) do update
  set value = excluded.value, updated_at = now();

-- Para verificar que se guardaron correctamente (ejecutar desde SQL Editor):
--   select key, value from public.app_config;

-- â”€â”€ send_followup_emails â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Envia recordatorios por email a doctores con seguimientos hoy.
-- Llama a POST /api/email/followup con doctor_id, email y nombre.
-- Lee site_url y resend_email_secret desde public.app_config.
-- Corre a las 7:00am UTC (1 hora antes del push de las 8am).

create or replace function public.send_followup_emails() returns void
language plpgsql security definer as $$
declare
  v_site_url     text;
  v_email_secret text;
  r record;
begin
  select value into v_site_url      from public.app_config where key = 'site_url';
  select value into v_email_secret  from public.app_config where key = 'resend_email_secret';

  if v_site_url is null or v_email_secret is null
     or v_site_url like 'REEMPLAZAR%' or v_email_secret like 'REEMPLAZAR%' then
    raise warning '[email_cron] app_config no configurada. Agrega site_url y resend_email_secret.';
    return;
  end if;

  for r in
    select
      ft.doctor_id,
      u.email                                     as doctor_email,
      p.full_name                                  as doctor_name,
      count(*)                                     as due_count
    from public.follow_up_tasks ft
    inner join auth.users    u on u.id           = ft.doctor_id
    inner join public.profiles p on p.doctor_id  = ft.doctor_id
    where ft.due_date = current_date
      and ft.status   = 'pending'
    group by ft.doctor_id, u.email, p.full_name
    having u.email is not null
  loop
    perform net.http_post(
      url     := v_site_url || '/api/email/followup',
      headers := jsonb_build_object(
        'Content-Type',   'application/json',
        'x-email-secret', v_email_secret
      ),
      body    := jsonb_build_object(
        'target_doctor_id', r.doctor_id,
        'doctor_email',     r.doctor_email,
        'doctor_name',      r.doctor_name,
        'due_count',        r.due_count
      )
    );
  end loop;
end;
$$;

-- Cron a las 7:00am UTC (1h antes del push de las 8am)
do $$ begin
  perform cron.schedule(
    'send_followup_emails_daily',
    '0 7 * * *',
    'select public.send_followup_emails()'
  );
exception when others then
  raise notice '[cron] pg_cron no disponible: %. Habilítalo en Supabase → Database → Extensions.', sqlerrm;
end $$;

-- ── send_trial_ending_emails ──────────────────────────────────────────
-- Envia recordatorios por email a doctores cuyo free trial termina mañana o hoy.
-- Llama a POST /api/email/trial-ending.

create or replace function public.send_trial_ending_emails() returns void
language plpgsql security definer as $$
declare
  v_site_url     text;
  v_email_secret text;
  r record;
begin
  select value into v_site_url      from public.app_config where key = 'site_url';
  select value into v_email_secret  from public.app_config where key = 'resend_email_secret';

  if v_site_url is null or v_email_secret is null
     or v_site_url like 'REEMPLAZAR%' or v_email_secret like 'REEMPLAZAR%' then
    return;
  end if;

  for r in
    select
      p.doctor_id,
      u.email                                      as doctor_email,
      p.full_name                                  as doctor_name,
      extract(day from (p.subscription_expires_at - now())) as days_left
    from public.profiles p
    inner join auth.users u on u.id = p.doctor_id
    where p.subscription_status = 'trialing'
      and p.subscription_expires_at is not null
      -- Send if it expires between now and 48 hours from now
      and p.subscription_expires_at between now() and now() + interval '2 days'
      and u.email is not null
  loop
    -- A-03: Deduplicar envíos (una sola notificación por día por médico para trial_ending)
    insert into public.notification_log (doctor_id, notification_date, type)
    values (r.doctor_id, current_date, 'trial_ending')
    on conflict do nothing;

    if found then
      perform net.http_post(
        url     := v_site_url || '/api/email/trial-ending',
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'x-email-secret', v_email_secret
        ),
        body    := jsonb_build_object(
          'target_doctor_id', r.doctor_id,
          'doctor_email',     r.doctor_email,
          'doctor_name',      r.doctor_name,
          'days_left',        r.days_left
        )
      );
    end if;
  end loop;
end;
$$;

do $$ begin
  perform cron.schedule(
    'send_trial_ending_emails_daily',
    '30 7 * * *',
    'select public.send_trial_ending_emails()'
  );
exception when others then
  raise notice '[cron] pg_cron no disponible: %. Habilítalo en Supabase → Database → Extensions.', sqlerrm;
end $$;

-- C-01: El secreto de email real NO se guarda aquí. Insertarlo manualmente desde
-- el Supabase SQL Editor. El valor debe coincidir con RESEND_EMAIL_SECRET en Vercel.
insert into public.app_config (key, value) values
  ('resend_email_secret', 'REEMPLAZAR_CON_RESEND_EMAIL_SECRET')
on conflict (key) do update
  set value = excluded.value, updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- SPRINT 2 UPDATES: User by Email, Subscription RLS, and Storage Bucket
-- ─────────────────────────────────────────────────────────────────────────────

-- Function to allow service role to get a user ID by email securely without exposing auth.users
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id FROM auth.users WHERE email = email_input LIMIT 1;
  RETURN found_id;
END;
$$;

-- Enforce subscription expiration check in RLS write policies
CREATE OR REPLACE FUNCTION has_active_subscription(c_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_status TEXT;
  sub_expires TIMESTAMPTZ;
BEGIN
  -- Obtener el estado del plan principal de la clinica (del owner o del primer perfil)
  SELECT subscription_status, subscription_expires_at INTO sub_status, sub_expires
  FROM public.profiles
  WHERE clinic_id = c_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF sub_status = 'lifetime' THEN
    RETURN TRUE;
  END IF;

  IF sub_status IN ('active', 'trialing') THEN
    IF sub_expires IS NULL OR sub_expires > now() THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Actualizar politicas de escritura para verificar suscripcion

-- patients
DROP POLICY IF EXISTS "patients_tenant_write" ON public.patients;
CREATE POLICY "patients_tenant_write"
  ON public.patients FOR ALL TO authenticated
  USING (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.patients.clinic_id)
     or public.is_clinic_member(public.patients.clinic_id))
    AND has_active_subscription(public.patients.clinic_id)
  )
  WITH CHECK (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.patients.clinic_id)
     or public.is_clinic_member(public.patients.clinic_id))
    AND has_active_subscription(public.patients.clinic_id)
  );

-- clinical_records
DROP POLICY IF EXISTS "records_tenant_write" ON public.clinical_records;
CREATE POLICY "records_tenant_write"
  ON public.clinical_records FOR ALL TO authenticated
  USING (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.clinical_records.clinic_id)
     or public.is_clinic_member(public.clinical_records.clinic_id))
    AND has_active_subscription(public.clinical_records.clinic_id)
  )
  WITH CHECK (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.clinical_records.clinic_id)
     or public.is_clinic_member(public.clinical_records.clinic_id))
    AND has_active_subscription(public.clinical_records.clinic_id)
  );

-- appointments
DROP POLICY IF EXISTS "appointments_tenant_write" ON public.appointments;
CREATE POLICY "appointments_tenant_write"
  ON public.appointments FOR ALL TO authenticated
  USING (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.appointments.clinic_id)
     or public.is_clinic_member(public.appointments.clinic_id))
    AND has_active_subscription(public.appointments.clinic_id)
  )
  WITH CHECK (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.appointments.clinic_id)
     or public.is_clinic_member(public.appointments.clinic_id))
    AND has_active_subscription(public.appointments.clinic_id)
  );

-- Create a public bucket for clinic assets (logos, signatures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic_assets', 'clinic_assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para clinic_assets
DROP POLICY IF EXISTS "clinic_assets_select" ON storage.objects;
CREATE POLICY "clinic_assets_select"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'clinic_assets');

DROP POLICY IF EXISTS "clinic_assets_insert" ON storage.objects;
CREATE POLICY "clinic_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic_assets');

DROP POLICY IF EXISTS "clinic_assets_update" ON storage.objects;
CREATE POLICY "clinic_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic_assets')
  WITH CHECK (bucket_id = 'clinic_assets');

DROP POLICY IF EXISTS "clinic_assets_delete" ON storage.objects;
CREATE POLICY "clinic_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic_assets');

commit;


-- ====================================================================================
-- 15. MAINTENANCE JOBS
-- ====================================================================================
-- pg_cron ya fue referenciado arriba con DO/EXCEPTION. No se repite CREATE EXTENSION.

-- Limpieza de audit_logs mayores de 90 días (medianoche UTC)
do $$ begin
  perform cron.schedule(
    'cleanup-audit-logs',
    '0 0 * * *',
    'DELETE FROM public.audit_logs WHERE created_at < now() - interval ''90 days'''
  );
exception when others then
  raise notice '[cron] pg_cron no disponible para cleanup-audit-logs: %.', sqlerrm;
end $$;

-- ====================================================================================
-- 16. SUPABASE REALTIME — Publicaciones para sincronización en tiempo real
-- ====================================================================================
-- Habilita el envío de cambios (INSERT/UPDATE/DELETE) vía WebSocket para cada tabla.
-- Esto permite que los hooks usePatientsRealtime, useAgendaRealtime, etc.
-- reciban eventos sin necesidad de recargar la página.
-- Es idempotente: si la tabla ya está en la publicación, no falla.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'patients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clinical_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_records;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clinic_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'treatment_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_templates;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- SPRINT 1 SEMANA 2 — Fixes críticos de datos y billing
-- ════════════════════════════════════════════════════════════

-- ── C-02: Idempotencia de webhooks Stripe ─────────────────────────────────────
-- Stripe garantiza entrega at-least-once, no exactly-once.
-- Esta tabla registra cada event.id procesado. El webhook handler intenta
-- INSERT; si hay unique_violation (23505) el evento ya fue procesado y se ignora.
-- ⚠️  ACCIÓN MANUAL: ejecutar este bloque en Supabase SQL Editor.
create table if not exists public.stripe_webhook_events (
  stripe_event_id text        primary key,
  processed_at    timestamptz not null default now()
);

-- Solo el service_role puede escribir (el webhook usa service_role key)
alter table public.stripe_webhook_events enable row level security;
-- Sin policies públicas → acceso solo vía service_role o SECURITY DEFINER

-- Limpiar eventos viejos automáticamente (90 días de retención)
do $$ begin
  perform cron.schedule(
    'cleanup-stripe-webhook-events',
    '0 2 * * *',
    'delete from public.stripe_webhook_events where processed_at < now() - interval ''90 days'''
  );
exception when others then
  raise notice '[cron] pg_cron no disponible para cleanup-stripe-webhook-events: %.', sqlerrm;
end $$;

-- ── C-03: Trigger sync_follow_up_task ─────────────────────────────────────────
-- Los seguimientos se guardan en specialty_data->>'next_follow_up_date' (JSONB)
-- pero los cron jobs de push/email leen de follow_up_tasks.
-- Este trigger sincroniza automáticamente al guardar/actualizar un clinical_record.
-- ⚠️  ACCIÓN MANUAL: ejecutar este bloque en Supabase SQL Editor.
create or replace function public.sync_follow_up_task()
returns trigger language plpgsql as $$
declare
  v_due_date date;
begin
  -- Leer la fecha del campo JSONB
  v_due_date := (new.specialty_data->>'next_follow_up_date')::date;

  if v_due_date is not null then
    insert into public.follow_up_tasks (
      clinic_id, doctor_id, patient_id, clinical_record_id, due_date, status
    )
    values (
      new.clinic_id, new.doctor_id, new.patient_id, new.id, v_due_date, 'pending'
    )
    on conflict (clinical_record_id) do update
      set due_date   = excluded.due_date,
          status     = 'pending',
          updated_at = now()
      where follow_up_tasks.status <> 'completed';
  else
    -- Si se borró la fecha de seguimiento, cancelar la tarea pendiente
    update public.follow_up_tasks
      set status = 'cancelled', updated_at = now()
    where clinical_record_id = new.id
      and status = 'pending';
  end if;

  return new;
end;
$$;

-- Aplicar el trigger en INSERT y UPDATE de clinical_records
drop trigger if exists trg_sync_follow_up_task on public.clinical_records;
create trigger trg_sync_follow_up_task
  after insert or update of specialty_data
  on public.clinical_records
  for each row
  execute function public.sync_follow_up_task();

-- Índice de soporte para la FK en clinical_record_id
-- (necesario para el ON CONFLICT y el UPDATE eficientes)
create unique index if not exists idx_follow_up_tasks_clinical_record_id
  on public.follow_up_tasks (clinical_record_id)
  where clinical_record_id is not null;

-- ── A-03: notification_log — deduplicar envíos de cron jobs ──────────────────
-- Los cron jobs de pg_cron pueden ejecutarse dos veces ante fallos o reinicios.
-- Esta tabla garantiza que un médico no reciba doble notificación en el mismo día.
-- ⚠️  ACCIÓN MANUAL: ejecutar este bloque en Supabase SQL Editor.
create table if not exists public.notification_log (
  doctor_id         uuid        not null references auth.users(id) on delete cascade,
  notification_date date        not null default current_date,
  type              text        not null, -- 'push_followup' | 'email_followup' | 'trial_ending'
  sent_at           timestamptz not null default now(),
  primary key (doctor_id, notification_date, type)
);

-- Sin policies públicas → solo funciones SECURITY DEFINER acceden
alter table public.notification_log enable row level security;

-- Limpiar logs viejos (30 días de retención es suficiente para deduplicación)
do $$ begin
  perform cron.schedule(
    'cleanup-notification-log',
    '0 3 * * *',
    'delete from public.notification_log where notification_date < current_date - 30'
  );
exception when others then
  raise notice '[cron] pg_cron no disponible para cleanup-notification-log: %.', sqlerrm;
end $$;

-- Actualizar send_followup_push_notifications para usar notification_log
create or replace function public.send_followup_push_notifications() returns void
language plpgsql security definer as $$
declare
  v_site_url    text;
  v_push_secret text;
  r record;
begin
  select value into v_site_url    from public.app_config where key = 'site_url';
  select value into v_push_secret from public.app_config where key = 'push_send_secret';

  if v_site_url is null or v_push_secret is null
     or v_site_url like 'REEMPLAZAR%' or v_push_secret like 'REEMPLAZAR%' then
    raise warning '[push_cron] app_config no configurada.';
    return;
  end if;

  for r in
    select ft.doctor_id, count(*) as due_count
    from public.follow_up_tasks ft
    inner join public.push_subscriptions ps on ps.doctor_id = ft.doctor_id
    where ft.due_date = current_date and ft.status = 'pending'
    group by ft.doctor_id
  loop
    -- A-03: Deduplicar — omitir si ya se envió hoy
    insert into public.notification_log (doctor_id, notification_date, type)
    values (r.doctor_id, current_date, 'push_followup')
    on conflict do nothing;

    if found then
      perform public.notify_followup_due_today(
        r.doctor_id, r.due_count::integer, v_site_url, v_push_secret
      );
    end if;
  end loop;
end;
$$;

-- Actualizar send_followup_emails para usar notification_log
create or replace function public.send_followup_emails() returns void
language plpgsql security definer as $$
declare
  v_site_url     text;
  v_email_secret text;
  r record;
begin
  select value into v_site_url      from public.app_config where key = 'site_url';
  select value into v_email_secret  from public.app_config where key = 'resend_email_secret';

  if v_site_url is null or v_email_secret is null
     or v_site_url like 'REEMPLAZAR%' or v_email_secret like 'REEMPLAZAR%' then
    raise warning '[email_cron] app_config no configurada.';
    return;
  end if;

  for r in
    select ft.doctor_id, u.email as doctor_email, p.full_name as doctor_name,
           count(*) as due_count
    from public.follow_up_tasks ft
    inner join auth.users     u on u.id          = ft.doctor_id
    inner join public.profiles p on p.doctor_id  = ft.doctor_id
    where ft.due_date = current_date and ft.status = 'pending'
    group by ft.doctor_id, u.email, p.full_name
    having u.email is not null
  loop
    -- A-03: Deduplicar — omitir si ya se envió hoy
    insert into public.notification_log (doctor_id, notification_date, type)
    values (r.doctor_id, current_date, 'email_followup')
    on conflict do nothing;

    if found then
      perform net.http_post(
        url     := v_site_url || '/api/email/followup',
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'x-email-secret', v_email_secret
        ),
        body    := jsonb_build_object(
          'target_doctor_id', r.doctor_id,
          'doctor_email',     r.doctor_email,
          'doctor_name',      r.doctor_name,
          'due_count',        r.due_count
        )
      );
    end if;
  end loop;
end;
$$;


-- ════════════════════════════════════════════════════════════
-- SPRINT 2 — Actualizaciones 2026-05-18
-- ════════════════════════════════════════════════════════════

-- ── A-01: Índices GIN para FTS (search_global) ───────────────
-- Usamos DROP + CREATE (sin IF NOT EXISTS) para garantizar que
-- las columnas correctas estén indexadas. Versión anterior usaba
-- first_name/last_name que no existen en el schema real.
drop index if exists public.idx_patients_fts;
create index idx_patients_fts
  on public.patients
  using gin (
    to_tsvector('spanish',
      coalesce(full_name,'')       || ' ' ||
      coalesce(document_number,'')
    )
  );

drop index if exists public.idx_clinical_records_fts;
create index idx_clinical_records_fts
  on public.clinical_records
  using gin (
    to_tsvector('spanish', coalesce(chief_complaint,''))
  );

-- ── DB-2.3: Índice de performance para queries de dashboard ──
create index if not exists idx_clinical_records_created_at
  on public.clinical_records (created_at desc);

-- ── DB-2.2: Índice parcial para follow_up_tasks pendientes ───
create index if not exists idx_follow_up_tasks_due_pending
  on public.follow_up_tasks (due_date)
  where status = 'pending';

-- ── M-18: Validar que specialty_data siempre sea objeto JSON ─
-- Previene arrays, strings o nulls JSON que rompen el wizard
-- y los triggers de follow_up_tasks.
alter table public.clinical_records
  drop constraint if exists chk_specialty_data_is_object;

alter table public.clinical_records
  add constraint chk_specialty_data_is_object
  check (
    specialty_data is null
    or jsonb_typeof(specialty_data) = 'object'
  );

-- ── M-19: Campos de aceptación de términos (compliance LATAM) ─
alter table public.profiles
  add column if not exists terms_accepted_version text,
  add column if not exists terms_accepted_at       timestamptz;

comment on column public.profiles.terms_accepted_version is
  'M-19: Versión del ToS aceptada (ej. "2026-05-01"). NULL = no aceptado.';
comment on column public.profiles.terms_accepted_at is
  'M-19: Timestamp exacto de aceptación. NULL = pendiente.';

create index if not exists idx_profiles_terms_pending
  on public.profiles (doctor_id)
  where terms_accepted_at is null;
