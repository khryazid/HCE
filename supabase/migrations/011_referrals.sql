-- ============================================================
-- 011_referrals.sql
-- Inter-doctor referral system (Plan Clínica only)
-- ============================================================
--
-- Enables doctors within the same organization to refer patients
-- to other doctors or to specialized departments (lab, imaging, surgery).
--
-- Referenced by: CLAUDE.md Section 4 — Esquema de Base de Datos
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- 1. CREATE referrals TABLE
-- ════════════════════════════════════════════════════════════

create table if not exists public.referrals (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.clinics(id) on delete cascade,
  from_member_id        uuid not null references public.clinic_members(id) on delete cascade,
  -- to_member_id is NULL when referring to a department instead of a specific doctor
  to_member_id          uuid references public.clinic_members(id) on delete set null,
  -- to_department is NULL when referring to a specific doctor
  to_department         text check (to_department in ('lab', 'imaging', 'surgery')),
  patient_id            uuid not null references public.patients(id) on delete cascade,
  consultation_id       uuid references public.clinical_records(id) on delete set null,
  note                  text,
  include_full_history  boolean not null default false,
  status                text not null default 'pending' check (status in ('pending', 'viewed', 'responded')),
  response_note         text,
  created_at            timestamptz not null default now(),
  responded_at          timestamptz,

  -- At least one destination must be specified
  constraint referrals_destination_check check (
    to_member_id is not null or to_department is not null
  )
);

-- ════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ════════════════════════════════════════════════════════════

create index if not exists idx_referrals_org
  on public.referrals (organization_id, status);

create index if not exists idx_referrals_from_member
  on public.referrals (from_member_id, status);

create index if not exists idx_referrals_to_member
  on public.referrals (to_member_id, status)
  where to_member_id is not null;

create index if not exists idx_referrals_to_department
  on public.referrals (organization_id, to_department, status)
  where to_department is not null;

create index if not exists idx_referrals_patient
  on public.referrals (patient_id);

-- ════════════════════════════════════════════════════════════
-- 3. RLS POLICIES
-- ════════════════════════════════════════════════════════════

alter table public.referrals enable row level security;

-- Members of the organization can read referrals they sent or received
drop policy if exists "referrals_select" on public.referrals;
create policy "referrals_select"
  on public.referrals for select to authenticated
  using (
    organization_id in (
      select clinic_id from public.clinic_members
      where doctor_id = auth.uid()
        and is_active = true
    )
  );

-- Only doctors/owners can create referrals
drop policy if exists "referrals_insert" on public.referrals;
create policy "referrals_insert"
  on public.referrals for insert to authenticated
  with check (
    exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role in ('owner', 'doctor')
        and is_active = true
    )
  );

-- Recipients can update (mark as viewed/responded)
drop policy if exists "referrals_update" on public.referrals;
create policy "referrals_update"
  on public.referrals for update to authenticated
  using (
    -- The recipient (to_member) can update
    to_member_id in (
      select id from public.clinic_members where doctor_id = auth.uid()
    )
    -- Or the sender can update (e.g., cancel)
    or from_member_id in (
      select id from public.clinic_members where doctor_id = auth.uid()
    )
    -- Or admin/owner of the org
    or public.is_clinic_admin(organization_id)
  );

commit;
