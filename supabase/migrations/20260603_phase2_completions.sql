-- ============================================================
-- 20260603_phase2_completions.sql
-- Phase 2 spec completions: triggers, constraints, remaining policies
-- ============================================================
--
-- ADDITIONS:
--   1. get_member_permissions() helper function
--   2. auto_create_department_order trigger on referrals
--   3. section_type NOT NULL enforcement on cash_transactions
--   4. referrals RLS plan check (clinica only)
--   5. clinical_records DELETE policy
--   6. search_patient_by_identification overload with clinic_id param
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- 1. HELPER: get_member_permissions
-- ════════════════════════════════════════════════════════════

create or replace function public.get_member_permissions(p_clinic_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(custom_permissions, '{}'::jsonb)
  from public.clinic_members
  where doctor_id = auth.uid()
    and clinic_id = p_clinic_id
    and is_active = true
  limit 1;
$$;


-- ════════════════════════════════════════════════════════════
-- 2. AUTO-CREATE department_order WHEN referral → department
-- ════════════════════════════════════════════════════════════
-- When a referral is inserted with to_department set (not to_member_id),
-- automatically create a department_order in 'pending' status.

create or replace function public.auto_create_department_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only if the referral targets a department (not a specific doctor)
  if NEW.to_department is not null then
    insert into public.department_orders (
      organization_id,
      department_type,
      patient_id,
      ordered_by_member_id,
      referral_id,
      status,
      notes
    ) values (
      NEW.organization_id,
      NEW.to_department,
      NEW.patient_id,
      NEW.from_member_id,
      NEW.id,
      'pending',
      NEW.note
    );
  end if;
  return NEW;
end;
$$;

-- Drop and recreate the trigger to be safe
drop trigger if exists referral_auto_create_order on public.referrals;
create trigger referral_auto_create_order
  after insert on public.referrals
  for each row execute function public.auto_create_department_order();


-- ════════════════════════════════════════════════════════════
-- 3. SECTION_TYPE NOT NULL ENFORCEMENT
-- ════════════════════════════════════════════════════════════
-- Backfill any remaining NULLs, then set NOT NULL

update public.cash_transactions
  set section_type = 'doctor'
  where section_type is null;

-- Only alter if not already NOT NULL (idempotent)
do $$
begin
  alter table public.cash_transactions
    alter column section_type set not null;
exception when others then
  raise notice 'section_type already NOT NULL or error: %', sqlerrm;
end $$;

-- Set default so new inserts without section_type don't fail during migration
alter table public.cash_transactions
  alter column section_type set default 'doctor';


-- ════════════════════════════════════════════════════════════
-- 4. REFERRALS RLS — PLAN CHECK (clinica only)
-- ════════════════════════════════════════════════════════════
-- Only organizations with plan_type = 'clinica' can access referrals.

-- Drop existing policies and recreate with plan check
drop policy if exists "referrals_select" on public.referrals;
drop policy if exists "referrals_insert" on public.referrals;
drop policy if exists "referrals_update" on public.referrals;

-- SELECT: doctor sees sent + received; department sees incoming
create policy "referrals_select"
  on public.referrals for select to authenticated
  using (
    -- Plan check: org must be clinica
    exists (
      select 1 from public.clinics c
      where c.id = organization_id
        and c.plan_type = 'clinica'
    )
    and (
      -- Doctor/owner: sent or received referrals
      (
        public.get_member_role(organization_id) in ('owner', 'doctor')
        and (
          from_member_id = public.get_member_id(organization_id)
          or to_member_id = public.get_member_id(organization_id)
        )
      )
      -- Department: referrals targeting their department
      or (
        to_department is not null
        and public.get_member_role(organization_id) = to_department
      )
      -- Clinic admin: all referrals for stats
      or public.get_member_role(organization_id) = 'clinic_admin'
    )
  );

-- INSERT: only owner/doctor can create referrals
create policy "referrals_insert"
  on public.referrals for insert to authenticated
  with check (
    exists (
      select 1 from public.clinics c
      where c.id = organization_id
        and c.plan_type = 'clinica'
    )
    and public.get_member_role(organization_id) in ('owner', 'doctor')
  );

-- UPDATE: recipient or sender can update
create policy "referrals_update"
  on public.referrals for update to authenticated
  using (
    exists (
      select 1 from public.clinics c
      where c.id = organization_id
        and c.plan_type = 'clinica'
    )
    and (
      -- Recipient can mark as viewed/responded
      to_member_id = public.get_member_id(organization_id)
      -- Sender can cancel/update
      or from_member_id = public.get_member_id(organization_id)
      -- Department can update
      or (
        to_department is not null
        and public.get_member_role(organization_id) = to_department
      )
      -- Admin can manage
      or public.is_clinic_admin(organization_id)
    )
  );


-- ════════════════════════════════════════════════════════════
-- 5. CLINICAL_RECORDS DELETE POLICY
-- ════════════════════════════════════════════════════════════

drop policy if exists "records_tenant_delete" on public.clinical_records;
create policy "records_tenant_delete"
  on public.clinical_records for delete to authenticated
  using (
    doctor_id = auth.uid()
    and (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.clinical_records.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role in ('owner', 'doctor')
          and cm.is_active = true
      )
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.clinical_records.clinic_id
      )
    )
  );


-- ════════════════════════════════════════════════════════════
-- 6. SEARCH PATIENT OVERLOAD with explicit clinic_id
-- ════════════════════════════════════════════════════════════
-- Used by departments that pass clinic_id explicitly

create or replace function public.search_patient_by_identification(
  p_clinic_id uuid,
  p_identification_number text
)
returns table (
  id uuid,
  full_name text,
  document_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Get user's role in this specific clinic
  select cm.role into v_role
  from public.clinic_members cm
  where cm.doctor_id = auth.uid()
    and cm.clinic_id = p_clinic_id
    and cm.is_active = true
  limit 1;

  if v_role is null then
    raise exception 'No eres miembro de esta organización'
      using errcode = '42501';
  end if;

  -- Only department roles can use this function
  if v_role not in ('lab', 'imaging', 'surgery') then
    raise exception 'Acceso denegado: solo departamentos pueden buscar por identificación'
      using errcode = '42501';
  end if;

  return query
    select p.id, p.full_name, p.document_number
    from public.patients p
    where p.clinic_id = p_clinic_id
      and p.document_number = p_identification_number
      and p.deleted_at is null
    limit 10;
end;
$$;

revoke all on function public.search_patient_by_identification(uuid, text) from anon;
grant execute on function public.search_patient_by_identification(uuid, text) to authenticated;


commit;
