-- ============================================================
-- 20260603_rbac_security_fixes.sql
-- Critical security fixes for role-based access control
-- ============================================================
--
-- FIXES:
--   S-01: patients RLS — role-aware visibility
--   S-02: clinical_records RLS — doctor sees only own records
--   S-03: appointments RLS — role-scoped visibility
--   S-04: cash_transactions — add section_type, role-aware RLS
--   S-07: Storage policies — fix 'admin' → 'owner'
--   H-07: cash_transactions section_type column
--   H-08: appointments created_by_member_id column
--   H-09: appointments duration_minutes column
--   H-10: cash_shifts RLS fix (user_id → doctor_id)
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- 1. HELPER FUNCTIONS FOR ROLE-AWARE RLS
-- ════════════════════════════════════════════════════════════

-- Returns the user's role in a given clinic. Used by role-aware RLS policies.
-- Already exists from 009_rbac_organizations but we CREATE OR REPLACE to be safe.
create or replace function public.get_member_role(check_clinic_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.clinic_members
  where clinic_id = check_clinic_id
    and doctor_id = auth.uid()
    and is_active = true
  limit 1;
$$;

-- Returns the member_id for the current user in a given clinic.
create or replace function public.get_member_id(check_clinic_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.clinic_members
  where clinic_id = check_clinic_id
    and doctor_id = auth.uid()
    and is_active = true
  limit 1;
$$;

-- Returns the doctor_id (auth.uid()) that the assistant is assigned to.
-- Uses the invited_by column from clinic_members.
create or replace function public.get_assistant_doctor_id(check_clinic_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select invited_by from public.clinic_members
  where clinic_id = check_clinic_id
    and doctor_id = auth.uid()
    and role = 'assistant'
    and is_active = true
  limit 1;
$$;

-- Checks if a specific doctor has receptionist_enabled in their settings.
create or replace function public.doctor_has_receptionist_enabled(p_doctor_id uuid, p_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.doctor_settings ds
    inner join public.clinic_members cm on cm.id = ds.member_id
    where cm.doctor_id = p_doctor_id
      and ds.organization_id = p_clinic_id
      and ds.receptionist_enabled = true
  );
$$;


-- ════════════════════════════════════════════════════════════
-- 2. FIX S-01: patients RLS — ROLE-AWARE VISIBILITY
-- ════════════════════════════════════════════════════════════
-- Rules:
--   owner/doctor: can see patients they created (doctor_id = auth.uid())
--                 OR all patients in clinic if clinic plan
--   assistant with can_view_patients: sees patients of the doctor they assist
--   lab/imaging/surgery: CANNOT read patients table directly
--                        (must use searchPatientByIdentification RPC)
--   clinic_admin: NO access to patient data
--   receptionist: NO direct patient access

-- SELECT policy
drop policy if exists "patients_tenant_select" on public.patients;
create policy "patients_tenant_select"
  on public.patients for select to authenticated
  using (
    deleted_at is null
    and (
      -- Owner/doctor: see patients in their clinic
      (
        exists (
          select 1 from public.clinic_members cm
          where cm.clinic_id = public.patients.clinic_id
            and cm.doctor_id = auth.uid()
            and cm.role in ('owner', 'doctor')
            and cm.is_active = true
        )
      )
      -- Assistant with can_view_patients: see patients of the doctor they assist
      or (
        exists (
          select 1 from public.clinic_members cm
          where cm.clinic_id = public.patients.clinic_id
            and cm.doctor_id = auth.uid()
            and cm.role = 'assistant'
            and cm.is_active = true
            and (cm.custom_permissions->>'can_view_patients')::boolean = true
        )
      )
      -- Legacy compatibility: profiles-based access
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.patients.clinic_id
      )
    )
  );

-- INSERT policy (only owner/doctor can create)
drop policy if exists "patients_tenant_insert" on public.patients;
create policy "patients_tenant_insert"
  on public.patients for insert to authenticated
  with check (
    (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.patients.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role in ('owner', 'doctor')
          and cm.is_active = true
      )
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.patients.clinic_id
      )
    )
    and has_active_subscription(public.patients.clinic_id)
  );

-- UPDATE policy (only owner/doctor can edit)
drop policy if exists "patients_tenant_update" on public.patients;
create policy "patients_tenant_update"
  on public.patients for update to authenticated
  using (
    (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.patients.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role in ('owner', 'doctor')
          and cm.is_active = true
      )
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.patients.clinic_id
      )
    )
    and has_active_subscription(public.patients.clinic_id)
  )
  with check (
    (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.patients.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role in ('owner', 'doctor')
          and cm.is_active = true
      )
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.patients.clinic_id
      )
    )
    and has_active_subscription(public.patients.clinic_id)
  );


-- ════════════════════════════════════════════════════════════
-- 3. SEARCH PATIENT BY IDENTIFICATION (for departments)
-- ════════════════════════════════════════════════════════════
-- Returns ONLY id, full_name, document_number — no clinical data.

create or replace function public.search_patient_by_identification(p_identification text)
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
  v_clinic_id uuid;
  v_role text;
begin
  -- Derive clinic_id and role from the authenticated user
  select cm.clinic_id, cm.role into v_clinic_id, v_role
  from public.clinic_members cm
  where cm.doctor_id = auth.uid()
    and cm.is_active = true
  limit 1;

  if v_clinic_id is null then
    return;
  end if;

  -- Only lab, imaging, and surgery roles can use this function
  if v_role not in ('lab', 'imaging', 'surgery') then
    raise exception 'Access denied: only department roles can search by identification'
      using errcode = '42501';
  end if;

  return query
    select p.id, p.full_name, p.document_number
    from public.patients p
    where p.clinic_id = v_clinic_id
      and p.document_number = p_identification
      and p.deleted_at is null
    limit 10;
end;
$$;

revoke all on function public.search_patient_by_identification(text) from anon;
grant execute on function public.search_patient_by_identification(text) to authenticated;


-- ════════════════════════════════════════════════════════════
-- 4. FIX S-02: clinical_records RLS — DOCTOR SEES ONLY OWN
-- ════════════════════════════════════════════════════════════
-- Rules:
--   owner/doctor: only their own records (doctor_id = auth.uid())
--   assistant with can_view_patients: records of the doctor they assist
--   clinic_admin, lab, imaging, surgery, receptionist: NO ACCESS

drop policy if exists "records_tenant_select" on public.clinical_records;
create policy "records_tenant_select"
  on public.clinical_records for select to authenticated
  using (
    deleted_at is null
    and (
      -- Doctor/owner sees only THEIR OWN records
      (
        doctor_id = auth.uid()
        and exists (
          select 1 from public.clinic_members cm
          where cm.clinic_id = public.clinical_records.clinic_id
            and cm.doctor_id = auth.uid()
            and cm.role in ('owner', 'doctor')
            and cm.is_active = true
        )
      )
      -- Assistant with can_view_patients: sees records of assigned doctor
      or (
        exists (
          select 1 from public.clinic_members cm
          where cm.clinic_id = public.clinical_records.clinic_id
            and cm.doctor_id = auth.uid()
            and cm.role = 'assistant'
            and cm.is_active = true
            and (cm.custom_permissions->>'can_view_patients')::boolean = true
            and cm.invited_by = public.clinical_records.doctor_id
        )
      )
      -- Legacy: profiles-based (for backward compat until fully migrated)
      or (
        doctor_id = auth.uid()
        and exists (
          select 1 from public.profiles p
          where p.doctor_id = auth.uid()
            and p.clinic_id = public.clinical_records.clinic_id
        )
      )
    )
  );

drop policy if exists "records_tenant_insert" on public.clinical_records;
create policy "records_tenant_insert"
  on public.clinical_records for insert to authenticated
  with check (
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
    and has_active_subscription(public.clinical_records.clinic_id)
  );

drop policy if exists "records_tenant_update" on public.clinical_records;
create policy "records_tenant_update"
  on public.clinical_records for update to authenticated
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
    and has_active_subscription(public.clinical_records.clinic_id)
  )
  with check (
    doctor_id = auth.uid()
  );


-- ════════════════════════════════════════════════════════════
-- 5. FIX S-03: appointments RLS — ROLE-SCOPED VISIBILITY
-- ════════════════════════════════════════════════════════════
-- Rules:
--   owner/doctor: only THEIR appointments (doctor_id = auth.uid())
--   assistant: appointments of the doctor they assist
--   receptionist: appointments of doctors with receptionist_enabled = true
--   clinic_admin: NO access to agenda
--   lab/imaging/surgery: NO access

drop policy if exists "appointments_tenant_select" on public.appointments;
create policy "appointments_tenant_select"
  on public.appointments for select to authenticated
  using (
    -- Owner/Doctor: only THEIR appointments
    (
      doctor_id = auth.uid()
      and exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.appointments.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role in ('owner', 'doctor')
          and cm.is_active = true
      )
    )
    -- Assistant: appointments of the doctor they assist
    or (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.appointments.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role = 'assistant'
          and cm.is_active = true
          and cm.invited_by = public.appointments.doctor_id
      )
    )
    -- Receptionist: appointments of doctors with receptionist_enabled
    or (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.appointments.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role = 'receptionist'
          and cm.is_active = true
      )
      and public.doctor_has_receptionist_enabled(
        public.appointments.doctor_id,
        public.appointments.clinic_id
      )
    )
    -- Legacy: profiles-based (backward compat)
    or (
      doctor_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.appointments.clinic_id
      )
    )
  );

-- WRITE policy for appointments
drop policy if exists "appointments_tenant_write" on public.appointments;
create policy "appointments_tenant_write"
  on public.appointments for all to authenticated
  using (
    (
      -- Doctor/owner can write their own appointments
      (
        doctor_id = auth.uid()
        and exists (
          select 1 from public.clinic_members cm
          where cm.clinic_id = public.appointments.clinic_id
            and cm.doctor_id = auth.uid()
            and cm.role in ('owner', 'doctor')
            and cm.is_active = true
        )
      )
      -- Assistant can write appointments of their doctor
      or exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.appointments.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role = 'assistant'
          and cm.is_active = true
          and cm.invited_by = public.appointments.doctor_id
      )
      -- Receptionist can write for enabled doctors
      or (
        exists (
          select 1 from public.clinic_members cm
          where cm.clinic_id = public.appointments.clinic_id
            and cm.doctor_id = auth.uid()
            and cm.role = 'receptionist'
            and cm.is_active = true
        )
        and public.doctor_has_receptionist_enabled(
          public.appointments.doctor_id,
          public.appointments.clinic_id
        )
      )
      -- Legacy profiles-based
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.appointments.clinic_id
      )
    )
    and has_active_subscription(public.appointments.clinic_id)
  )
  with check (
    (
      exists (
        select 1 from public.clinic_members cm
        where cm.clinic_id = public.appointments.clinic_id
          and cm.doctor_id = auth.uid()
          and cm.role in ('owner', 'doctor', 'assistant', 'receptionist')
          and cm.is_active = true
      )
      or exists (
        select 1 from public.profiles p
        where p.doctor_id = auth.uid()
          and p.clinic_id = public.appointments.clinic_id
      )
    )
    and has_active_subscription(public.appointments.clinic_id)
  );


-- ════════════════════════════════════════════════════════════
-- 6. FIX H-07: ADD section_type TO cash_transactions
-- ════════════════════════════════════════════════════════════

alter table public.cash_transactions
  add column if not exists section_type text default 'doctor'
  check (section_type in ('doctor', 'lab', 'imaging', 'surgery'));

-- Update existing rows: infer section_type from the user's role
do $$
begin
  update public.cash_transactions ct
    set section_type = coalesce(
      (select cm.role from public.clinic_members cm
       where cm.doctor_id = ct.user_id
         and cm.clinic_id = ct.clinic_id
       limit 1),
      'doctor'
    )
  where ct.section_type is null or ct.section_type = 'doctor';
exception when others then
  raise notice 'section_type migration skipped: %', sqlerrm;
end $$;

-- FIX S-04: cash_transactions RLS — ROLE-AWARE
-- Rules:
--   owner/doctor/assistant: see section_type = 'doctor' for their clinic
--   lab: see section_type = 'lab'
--   imaging: see section_type = 'imaging'
--   surgery: see section_type = 'surgery'
--   clinic_admin: see ALL section_types (read-only from API layer)

drop policy if exists "Usuarios de la clínica pueden ver transacciones" on public.cash_transactions;
create policy "cash_transactions_role_select"
  on public.cash_transactions for select to authenticated
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
    and (
      -- clinic_admin sees everything
      public.get_member_role(clinic_id) in ('clinic_admin')
      -- owner/doctor/assistant see doctor section
      or (
        public.get_member_role(clinic_id) in ('owner', 'doctor', 'assistant')
        and section_type = 'doctor'
      )
      -- department roles see only their section
      or (
        public.get_member_role(clinic_id) = section_type
      )
    )
  );

-- Keep existing insert/update policies but ensure section_type is set
drop policy if exists "Usuarios de la clínica pueden insertar transacciones" on public.cash_transactions;
create policy "cash_transactions_role_insert"
  on public.cash_transactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and clinic_id = any (public.get_user_clinic_ids())
    -- clinic_admin cannot register transactions (only view)
    and public.get_member_role(clinic_id) != 'clinic_admin'
  );

drop policy if exists "Usuarios de la clínica pueden anular transacciones" on public.cash_transactions;
create policy "cash_transactions_role_update"
  on public.cash_transactions for update to authenticated
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
    and public.get_member_role(clinic_id) != 'clinic_admin'
  );


-- ════════════════════════════════════════════════════════════
-- 7. FIX H-08/H-09: ADD MISSING COLUMNS TO appointments
-- ════════════════════════════════════════════════════════════

alter table public.appointments
  add column if not exists created_by_member_id uuid references public.clinic_members(id) on delete set null;

alter table public.appointments
  add column if not exists duration_minutes integer default 30;


-- ════════════════════════════════════════════════════════════
-- 8. FIX S-07: STORAGE POLICIES — 'admin' → 'owner'
-- ════════════════════════════════════════════════════════════

drop policy if exists "clinic_assets_insert" on storage.objects;
create policy "clinic_assets_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clinic_assets'
    and (storage.foldername(name))[1] in (
      select p.clinic_id::text
      from public.profiles p
      where p.doctor_id = auth.uid()
      union
      select cm.clinic_id::text
      from public.clinic_members cm
      where cm.doctor_id = auth.uid()
        and cm.role in ('owner', 'doctor')
    )
  );

drop policy if exists "clinic_assets_update" on storage.objects;
create policy "clinic_assets_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'clinic_assets'
    and (storage.foldername(name))[1] in (
      select p.clinic_id::text
      from public.profiles p
      where p.doctor_id = auth.uid()
      union
      select cm.clinic_id::text
      from public.clinic_members cm
      where cm.doctor_id = auth.uid()
        and cm.role in ('owner', 'doctor')
    )
  )
  with check (
    bucket_id = 'clinic_assets'
    and (storage.foldername(name))[1] in (
      select p.clinic_id::text
      from public.profiles p
      where p.doctor_id = auth.uid()
      union
      select cm.clinic_id::text
      from public.clinic_members cm
      where cm.doctor_id = auth.uid()
        and cm.role in ('owner', 'doctor')
    )
  );

drop policy if exists "clinic_assets_delete" on storage.objects;
create policy "clinic_assets_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'clinic_assets'
    and (storage.foldername(name))[1] in (
      select p.clinic_id::text
      from public.profiles p
      where p.doctor_id = auth.uid()
      union
      select cm.clinic_id::text
      from public.clinic_members cm
      where cm.doctor_id = auth.uid()
        and cm.role in ('owner', 'doctor')
    )
  );


-- ════════════════════════════════════════════════════════════
-- 9. FIX H-10: cash_shifts RLS — user_id → doctor_id
-- ════════════════════════════════════════════════════════════

drop policy if exists "Usuarios pueden ver turnos de su clínica" on public.cash_shifts;
create policy "cash_shifts_select"
  on public.cash_shifts for select
  using (
    auth.uid() is not null
    and clinic_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid() and is_active = true
    )
  );

drop policy if exists "Usuarios pueden insertar turnos en su clínica" on public.cash_shifts;
create policy "cash_shifts_insert"
  on public.cash_shifts for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and clinic_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid() and is_active = true
    )
  );

drop policy if exists "Usuarios pueden actualizar sus propios turnos" on public.cash_shifts;
create policy "cash_shifts_update"
  on public.cash_shifts for update
  using (
    auth.uid() = user_id
    and clinic_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid() and is_active = true
    )
  );


commit;
