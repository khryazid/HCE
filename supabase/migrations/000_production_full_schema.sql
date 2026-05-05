-- ============================================================
-- HCE Multiespecialidad — Schema Completo de Producción
-- Versión: 2.0 (unificado con todas las migraciones)
-- ============================================================
-- Instrucciones:
--   1. Abre el SQL Editor de tu proyecto en Supabase
--   2. Pega este archivo completo y ejecuta
--   3. Es idempotente: se puede re-ejecutar sin romper datos
--      existentes (usa IF NOT EXISTS / IF EXISTS en todo)
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- EXTENSIONES
-- ════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════
-- TABLAS
-- ════════════════════════════════════════════════════════════

-- profiles
-- Una fila por médico (doctor_id = auth.uid()).
-- clinic_id permite multi-clínica en el futuro.
create table if not exists public.profiles (
  id                      uuid        primary key default gen_random_uuid(),
  clinic_id               uuid        not null,
  doctor_id               uuid        not null references auth.users (id) on delete cascade,
  full_name               text        not null,
  specialty               text[]      not null default '{}',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  -- Valores posibles:
  --   Stripe-driven: incomplete, incomplete_expired, trialing, active,
  --                  past_due, canceled, unpaid, paused
  --   Admin-driven:  lifetime (acceso permanente sin Stripe)
  subscription_status     text        default 'incomplete'
    check (subscription_status in (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused', 'lifetime'
    )),
  -- NULL = sin expiración (lifetime o sin plan de tiempo)
  -- Fecha ISO 8601 = el acceso expira en esa fecha
  subscription_expires_at timestamptz default null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (clinic_id, doctor_id)
);

-- patients
create table if not exists public.patients (
  id              uuid  primary key default gen_random_uuid(),
  clinic_id       uuid  not null,
  doctor_id       uuid  not null references auth.users (id) on delete cascade,
  document_number text  not null,
  full_name       text  not null,
  birth_date      date,
  status          text  not null default 'activo'
    check (status in ('activo', 'inactivo', 'en-seguimiento', 'alta')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (clinic_id, document_number)
);

-- clinical_records
-- Una fila por consulta/seguimiento. El campo specialty_data es un JSONB
-- que almacena los datos clínicos específicos de cada especialidad.
create table if not exists public.clinical_records (
  id             uuid  primary key default gen_random_uuid(),
  clinic_id      uuid  not null,
  doctor_id      uuid  not null references auth.users (id) on delete cascade,
  patient_id     uuid  not null references public.patients (id) on delete cascade,
  chief_complaint text  not null,
  cie_codes       text[] not null default '{}',
  specialty_kind  text  not null,
  specialty_data  jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- specialty_data
-- Tabla hermana de clinical_records para datos extendidos por especialidad.
-- Permite queries y reporte sin parsear el JSONB en clinical_records.
create table if not exists public.specialty_data (
  id                 uuid  primary key default gen_random_uuid(),
  clinic_id          uuid  not null,
  doctor_id          uuid  not null references auth.users (id) on delete cascade,
  clinical_record_id uuid  not null references public.clinical_records (id) on delete cascade,
  specialty_kind     text  not null,
  data               jsonb not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- audit_logs
-- Log inmutable de eventos clínicos con hashing en cadena (tipo blockchain).
-- No se permite UPDATE ni DELETE vía RLS.
create table if not exists public.audit_logs (
  id            bigint generated always as identity primary key,
  clinic_id     uuid    not null,
  doctor_id     uuid    references auth.users (id) on delete set null,
  event_type    text    not null,
  resource_type text    not null,
  resource_id   uuid    not null,
  changes       jsonb   not null,
  metadata      jsonb   not null default '{}'::jsonb,
  previous_hash text,
  entry_hash    text    not null,
  sequence_no   bigint  not null,
  created_at    timestamptz not null default now()
);

-- follow_up_tasks
-- Citas de seguimiento programadas desde el wizard.
create table if not exists public.follow_up_tasks (
  id                 uuid  primary key default gen_random_uuid(),
  clinic_id          uuid  not null,
  doctor_id          uuid  not null references auth.users (id) on delete cascade,
  patient_id         uuid  not null references public.patients (id) on delete cascade,
  clinical_record_id uuid  references public.clinical_records (id) on delete set null,
  due_date           date  not null,
  status             text  not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  note               text  not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- api_rate_limits
-- Contador de rate-limiting por scope+usuario dentro de una ventana de tiempo.
create table if not exists public.api_rate_limits (
  scope              text     not null,
  identifier         uuid     not null references auth.users (id) on delete cascade,
  window_started_at  timestamptz not null default now(),
  request_count      integer  not null default 0,
  updated_at         timestamptz not null default now(),
  primary key (scope, identifier)
);

-- push_subscriptions
-- Almacena las suscripciones de los dispositivos para Web Push Notifications.
create table if not exists public.push_subscriptions (
  id          uuid    primary key default gen_random_uuid(),
  clinic_id   uuid    not null,
  doctor_id   uuid    not null references auth.users (id) on delete cascade,
  endpoint    text    not null unique,
  p256dh      text    not null,
  auth        text    not null,
  created_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- COMPATIBILIDAD: columnas / constraints sobre entornos ya creados
-- Estas líneas son no-ops en una instalación nueva.
-- ════════════════════════════════════════════════════════════

-- subscription_expires_at (incorporado desde migración 2025-04-30)
alter table public.profiles
  add column if not exists subscription_expires_at timestamptz default null;

-- 'lifetime' en subscription_status
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;
alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused', 'lifetime'
  ));

-- patients.status (por si la columna no tiene el CHECK actualizado)
alter table public.patients
  add column if not exists status text not null default 'activo';
alter table public.patients
  drop constraint if exists patients_status_check;
alter table public.patients
  add constraint patients_status_check
  check (status in ('activo', 'inactivo', 'en-seguimiento', 'alta'));

-- audit_logs.doctor_id nullable + FK con ON DELETE SET NULL
alter table public.audit_logs
  alter column doctor_id drop not null;
alter table public.audit_logs
  drop constraint if exists audit_logs_doctor_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_doctor_id_fkey
  foreign key (doctor_id) references auth.users (id) on delete set null;

-- ════════════════════════════════════════════════════════════
-- MIGRACIÓN DE specialty (TEXT -> TEXT[])
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='specialty' AND data_type='text'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN specialty TYPE text[] USING string_to_array(specialty, ' | ');
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- ÍNDICES
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

-- Índice único para Stripe (evita duplicados de customer)
create unique index if not exists idx_profiles_stripe_customer
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Índice para queries de expiración de suscripción (admin panel / cron)
create index if not exists idx_profiles_subscription_expires_at
  on public.profiles (subscription_expires_at)
  where subscription_expires_at is not null;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.patients          enable row level security;
alter table public.clinical_records  enable row level security;
alter table public.specialty_data    enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.follow_up_tasks   enable row level security;
alter table public.api_rate_limits   enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: solo el propio médico puede leer/escribir su perfil
drop policy if exists "profiles_tenant_select" on public.profiles;
create policy "profiles_tenant_select"
  on public.profiles for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "profiles_tenant_write" on public.profiles;
create policy "profiles_tenant_write"
  on public.profiles for all to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- patients: acceso por clinic_id del perfil del médico autenticado
drop policy if exists "patients_tenant_select" on public.patients;
create policy "patients_tenant_select"
  on public.patients for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.patients.clinic_id
    )
  );

drop policy if exists "patients_tenant_write" on public.patients;
create policy "patients_tenant_write"
  on public.patients for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.patients.clinic_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.patients.clinic_id
    )
  );

-- clinical_records
drop policy if exists "records_tenant_select" on public.clinical_records;
create policy "records_tenant_select"
  on public.clinical_records for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinical_records.clinic_id
    )
  );

drop policy if exists "records_tenant_write" on public.clinical_records;
create policy "records_tenant_write"
  on public.clinical_records for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinical_records.clinic_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.clinical_records.clinic_id
    )
  );

-- specialty_data
drop policy if exists "specialty_tenant_select" on public.specialty_data;
create policy "specialty_tenant_select"
  on public.specialty_data for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.specialty_data.clinic_id
    )
  );

drop policy if exists "specialty_tenant_write" on public.specialty_data;
create policy "specialty_tenant_write"
  on public.specialty_data for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.specialty_data.clinic_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.specialty_data.clinic_id
    )
  );

-- audit_logs: insert propio + select propio; UPDATE y DELETE bloqueados
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

-- follow_up_tasks
drop policy if exists "followup_tenant_select" on public.follow_up_tasks;
create policy "followup_tenant_select"
  on public.follow_up_tasks for select to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "followup_tenant_write" on public.follow_up_tasks;
create policy "followup_tenant_write"
  on public.follow_up_tasks for all to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- push_subscriptions
drop policy if exists "push_subscriptions_tenant_select" on public.push_subscriptions;
create policy "push_subscriptions_tenant_select"
  on public.push_subscriptions for select to authenticated
  using (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.push_subscriptions.clinic_id
    )
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
    )
  )
  with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.doctor_id = auth.uid()
        and p.clinic_id = public.push_subscriptions.clinic_id
    )
  );

-- ════════════════════════════════════════════════════════════
-- FUNCIONES Y TRIGGERS
-- ════════════════════════════════════════════════════════════

-- Trigger helper: actualiza updated_at automáticamente en cualquier UPDATE
create or replace function public.bump_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at   on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_patients_updated_at   on public.patients;
create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_records_updated_at    on public.clinical_records;
create trigger trg_records_updated_at
  before update on public.clinical_records
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_specialty_updated_at  on public.specialty_data;
create trigger trg_specialty_updated_at
  before update on public.specialty_data
  for each row execute function public.bump_updated_at();

drop trigger if exists trg_followups_updated_at  on public.follow_up_tasks;
create trigger trg_followups_updated_at
  before update on public.follow_up_tasks
  for each row execute function public.bump_updated_at();

-- log_audit_event: inserta en audit_logs con hash encadenado tipo blockchain.
-- Llamar desde la app o desde otros triggers.
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
      v_prev_hash   || '|' ||
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

-- claim_api_rate_limit: rate-limiting atómico por ventana de tiempo.
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

-- ════════════════════════════════════════════════════════════
-- VISTAS MATERIALIZADAS
-- ════════════════════════════════════════════════════════════

-- KPIs diarios de dashboard (consultas y pacientes creados por día)
-- Refrescar con un cron job (ver nota abajo).
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
-- CRON JOBS (Requiere extensión pg_cron activada)
-- ════════════════════════════════════════════════════════════

-- Activar pg_cron (por si no está activa en Supabase)
create extension if not exists "pg_cron" with schema "extensions";

-- Crear el cron job que refresca los KPIs a la medianoche (00:00)
-- (Si el job ya existe, cron.schedule lo actualiza automáticamente)
select cron.schedule(
  'refresh_mv_kpis_daily',
  '0 0 * * *',
  $$refresh materialized view public.mv_dashboard_kpis_daily$$
);

commit;