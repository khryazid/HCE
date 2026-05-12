-- ============================================================
-- MIGRACIÓN DE AGENDA Y PAGOS
-- Ejecutar en Supabase -> SQL Editor
-- ============================================================

begin;

-- 1. Agregar configuración de pagos a perfiles
alter table public.profiles
  add column if not exists payment_config jsonb not null default '{}'::jsonb;

-- 2. Crear tabla de citas (appointments)
create table if not exists public.appointments (
  id              uuid        primary key default gen_random_uuid(),
  clinic_id       uuid        not null,
  doctor_id       uuid        not null references auth.users (id) on delete cascade,
  patient_id      uuid        references public.patients (id) on delete set null,
  patient_name    text        not null,
  patient_phone   text,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  status          text        not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  payment_status  text        not null default 'pending'
    check (payment_status in ('pending', 'paid', 'partial')),
  payment_method  text,
  amount          numeric(10,2),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3. Índices
create index if not exists idx_appointments_tenant_time
  on public.appointments (clinic_id, doctor_id, start_time);

-- 4. RLS
alter table public.appointments enable row level security;

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

-- 5. Triggers
drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.bump_updated_at();

commit;
