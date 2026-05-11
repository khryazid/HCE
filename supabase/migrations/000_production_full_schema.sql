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

-- ── push_subscriptions ───────────────────────────────────────
-- El médico solo ve y gestiona sus propias suscripciones push.
drop policy if exists "push_subscriptions_tenant_select" on public.push_subscriptions;
create policy "push_subscriptions_tenant_select"
  on public.push_subscriptions for select to authenticated
  using (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.push_subscriptions.clinic_id
    ) or public.is_clinic_member(public.push_subscriptions.clinic_id)
  );

drop policy if exists "push_subscriptions_tenant_write" on public.push_subscriptions;
create policy "push_subscriptions_tenant_write"
  on public.push_subscriptions for all to authenticated
  using (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.push_subscriptions.clinic_id
    ) or public.is_clinic_member(public.push_subscriptions.clinic_id)
  )
  with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.push_subscriptions.clinic_id
    ) or public.is_clinic_member(public.push_subscriptions.clinic_id)
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

drop trigger if exists trg_treatment_templates_updated_at on public.treatment_templates;
create trigger trg_treatment_templates_updated_at
  before update on public.treatment_templates
  for each row execute function public.bump_updated_at();

-- ── log_audit_event ──────────────────────────────────────────
-- Inserta en audit_logs con hash encadenado (estilo blockchain).
-- Llamar desde la app o desde otros triggers. security definer
-- permite que cualquier médico autenticado inserte sin acceso directo a la tabla.
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
-- Full-text search across patients and clinical_records for the
-- caller's clinic. Uses websearch_to_tsquery so plain phrases
-- like "garcia diabetes" work without special syntax.
-- Returns results ranked by ts_rank, limited to 20 per kind.
-- Runs as SECURITY INVOKER so RLS policies are fully respected.

create or replace function public.search_global(
  p_query     text,
  p_clinic_id uuid
)
returns table (
  kind        text,
  id          uuid,
  title       text,
  subtitle    text,
  patient_id  uuid,
  updated_at  timestamptz,
  rank        real
)
language sql
security invoker
stable
as $$
  -- Each branch wrapped in a subquery so ORDER BY + LIMIT are valid
  -- before the UNION ALL. PostgreSQL requires this when combining
  -- sorted/limited sets.
  select * from (
    select
      'patient'::text                              as kind,
      pat.id                                       as id,
      pat.full_name                                as title,
      'Doc: ' || coalesce(pat.document_number,'—') as subtitle,
      pat.id                                       as patient_id,
      pat.updated_at                               as updated_at,
      ts_rank(
        to_tsvector('spanish', coalesce(pat.full_name,'') || ' ' || coalesce(pat.document_number,'')),
        websearch_to_tsquery('spanish', p_query)
      )                                            as rank
    from public.patients pat
    where
      pat.clinic_id = p_clinic_id
      and to_tsvector('spanish', coalesce(pat.full_name,'') || ' ' || coalesce(pat.document_number,''))
          @@ websearch_to_tsquery('spanish', p_query)
    order by rank desc
    limit 20
  ) patients_results

  union all

  select * from (
    select
      'consultation'::text                                               as kind,
      cr.id                                                              as id,
      coalesce(cr.chief_complaint, '(sin motivo)')                       as title,
      cr.specialty_kind || ' — ' || to_char(cr.created_at, 'DD Mon YYYY') as subtitle,
      cr.patient_id                                                      as patient_id,
      cr.updated_at                                                      as updated_at,
      ts_rank(
        to_tsvector('spanish', coalesce(cr.chief_complaint,'')),
        websearch_to_tsquery('spanish', p_query)
      )                                                                  as rank
    from public.clinical_records cr
    where
      cr.clinic_id = p_clinic_id
      and to_tsvector('spanish', coalesce(cr.chief_complaint,''))
          @@ websearch_to_tsquery('spanish', p_query)
    order by rank desc
    limit 20
  ) consultation_results

  order by rank desc
$$;

grant execute on function public.search_global(text, uuid)
  to authenticated;

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

-- ════════════════════════════════════════════════════════════
-- 7. CRON JOBS (requiere pg_cron activada en Supabase)
-- ════════════════════════════════════════════════════════════

-- Activar pg_cron (no-op si ya está activa)
create extension if not exists "pg_cron" with schema "extensions";

-- Refresca los KPIs a medianoche cada día.
-- cron.schedule actualiza el job si ya existe con ese nombre.
select cron.schedule(
  'refresh_mv_kpis_daily',
  '0 0 * * *',
  $$refresh materialized view public.mv_dashboard_kpis_daily$$
);

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

create extension if not exists "pg_net" with schema "extensions";

-- Función auxiliar: envía push para un doctor específico con sus seguimientos de hoy
create or replace function public.notify_followup_due_today(
  p_doctor_id    uuid,
  p_due_count    integer,
  p_site_url     text,
  p_push_secret  text
) returns void language plpgsql security definer as $$
begin
  perform extensions.http_post(
    url     := p_site_url || '/api/push/send',
    body    := jsonb_build_object(
                 'target_doctor_id', p_doctor_id::text,
                 'title', 'Glyph — Seguimientos para hoy',
                 'body',  'Tienes ' || p_due_count || ' seguimiento(s) que vence(n) hoy.',
                 'url',   '/pacientes'
               )::text,
    params  := '{}'::extensions.http_header[],
    headers := ARRAY[
      extensions.http_header('Content-Type', 'application/json'),
      extensions.http_header('x-push-secret', p_push_secret)
    ]
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
select cron.schedule(
  'send_followup_push_daily',
  '0 8 * * *',
  $$select public.send_followup_push_notifications()$$
);

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

-- Inserta o actualiza los valores de configuración
insert into public.app_config (key, value) values
  ('site_url',         'https://glyphce.vercel.app/'),
  ('push_send_secret', '6e0300c35f48bd830ace18216ec96e0f0c0ac23afa774c56470c9f18ce5171bc')
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
select cron.schedule(
  'send_followup_emails_daily',
  '0 7 * * *',
  $$select public.send_followup_emails()$$
);

-- Agrega el secreto de email a app_config
insert into public.app_config (key, value) values
  ('resend_email_secret', '183492765')
on conflict (key) do update
  set value = excluded.value, updated_at = now();
commit;
