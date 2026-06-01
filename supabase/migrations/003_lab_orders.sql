-- Migración 003: Lab Orders y Medical Referrals

begin;

-- ==============================================================================
-- 1. LAB ORDERS
-- ==============================================================================
create table if not exists public.lab_orders (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  doctor_id           uuid not null references auth.users (id) on delete cascade,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  clinical_record_id  uuid references public.clinical_records (id) on delete set null,
  order_type          text not null check (order_type in ('laboratory', 'imaging')),
  items               jsonb not null default '[]',  -- [{name, code?, notes}]
  reason              text not null default '',     -- razón de la referencia
  status              text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  results             jsonb,                        -- resultados subidos por lab
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS para Lab Orders
alter table public.lab_orders enable row level security;

drop policy if exists "Médicos pueden leer órdenes de su clínica" on public.lab_orders;
create policy "Médicos pueden leer órdenes de su clínica"
  on public.lab_orders for select
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
  );

drop policy if exists "Médicos pueden insertar órdenes en su clínica" on public.lab_orders;
create policy "Médicos pueden insertar órdenes en su clínica"
  on public.lab_orders for insert
  with check (
    auth.uid() = doctor_id
    and clinic_id = any (public.get_user_clinic_ids())
  );

drop policy if exists "Médicos pueden actualizar órdenes en su clínica" on public.lab_orders;
create policy "Médicos pueden actualizar órdenes en su clínica"
  on public.lab_orders for update
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
  );

drop policy if exists "Médicos pueden eliminar órdenes de su clínica" on public.lab_orders;
create policy "Médicos pueden eliminar órdenes de su clínica"
  on public.lab_orders for delete
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
  );

create index if not exists idx_lab_orders_tenant on public.lab_orders (clinic_id, doctor_id);
create index if not exists idx_lab_orders_patient on public.lab_orders (patient_id);


-- ==============================================================================
-- 2. MEDICAL REFERRALS
-- ==============================================================================
create table if not exists public.medical_referrals (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  referring_doctor_id uuid not null references auth.users (id) on delete cascade,
  referred_doctor_id  uuid references auth.users (id) on delete set null, -- Null for external doctors
  external_doctor_name text, -- Para doctores fuera del sistema
  external_doctor_contact text,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  clinical_record_id  uuid references public.clinical_records (id) on delete set null,
  reason              text not null,
  include_report      boolean not null default false,
  status              text not null default 'pending'
    check (status in ('pending', 'accepted', 'completed', 'declined')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS para Medical Referrals
alter table public.medical_referrals enable row level security;

drop policy if exists "Médicos pueden leer referencias de su clínica" on public.medical_referrals;
create policy "Médicos pueden leer referencias de su clínica"
  on public.medical_referrals for select
  using (
    auth.uid() is not null
    and (
      clinic_id = any (public.get_user_clinic_ids())
      or referred_doctor_id = auth.uid()
    )
  );

drop policy if exists "Médicos pueden crear referencias" on public.medical_referrals;
create policy "Médicos pueden crear referencias"
  on public.medical_referrals for insert
  with check (
    auth.uid() = referring_doctor_id
    and clinic_id = any (public.get_user_clinic_ids())
  );

drop policy if exists "Médicos pueden actualizar referencias" on public.medical_referrals;
create policy "Médicos pueden actualizar referencias"
  on public.medical_referrals for update
  using (
    auth.uid() is not null
    and (
      clinic_id = any (public.get_user_clinic_ids())
      or referred_doctor_id = auth.uid()
    )
  );

drop policy if exists "Médicos pueden eliminar referencias" on public.medical_referrals;
create policy "Médicos pueden eliminar referencias"
  on public.medical_referrals for delete
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
  );

create index if not exists idx_medical_referrals_tenant on public.medical_referrals (clinic_id, referring_doctor_id);
create index if not exists idx_medical_referrals_patient on public.medical_referrals (patient_id);
create index if not exists idx_medical_referrals_referred on public.medical_referrals (referred_doctor_id);

commit;
