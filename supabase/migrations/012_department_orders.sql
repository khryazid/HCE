-- ============================================================
-- 012_department_orders.sql
-- Department orders for lab, imaging, and surgery
-- ============================================================
--
-- Tracks orders placed by doctors to specialized departments.
-- Each department (lab, imaging, surgery) sees only their own orders.
--
-- Referenced by: CLAUDE.md Section 4 — Esquema de Base de Datos
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- 1. CREATE department_orders TABLE
-- ════════════════════════════════════════════════════════════

create table if not exists public.department_orders (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.clinics(id) on delete cascade,
  department_type       text not null check (department_type in ('lab', 'imaging', 'surgery')),
  patient_id            uuid not null references public.patients(id) on delete cascade,
  ordered_by_member_id  uuid not null references public.clinic_members(id) on delete cascade,
  -- Optional link to the referral that triggered this order
  referral_id           uuid references public.referrals(id) on delete set null,
  status                text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  -- Department-specific fields
  title                 text,
  notes                 text,
  result_notes          text,
  completed_by_member_id uuid references public.clinic_members(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz
);

-- ════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ════════════════════════════════════════════════════════════

create index if not exists idx_dept_orders_org_type
  on public.department_orders (organization_id, department_type, status);

create index if not exists idx_dept_orders_patient
  on public.department_orders (patient_id);

create index if not exists idx_dept_orders_ordered_by
  on public.department_orders (ordered_by_member_id);

create index if not exists idx_dept_orders_status
  on public.department_orders (organization_id, status)
  where status != 'done';

-- ════════════════════════════════════════════════════════════
-- 3. RLS POLICIES
-- ════════════════════════════════════════════════════════════

alter table public.department_orders enable row level security;

-- Doctors/owners can see all orders in their org
-- Department roles can see only orders for their department
drop policy if exists "dept_orders_select" on public.department_orders;
create policy "dept_orders_select"
  on public.department_orders for select to authenticated
  using (
    -- Doctors and owners see all orders in their org
    exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role in ('owner', 'doctor')
        and is_active = true
    )
    -- Department members see only their department's orders
    or exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role = department_type
        and is_active = true
    )
  );

-- Only doctors/owners can create orders
drop policy if exists "dept_orders_insert" on public.department_orders;
create policy "dept_orders_insert"
  on public.department_orders for insert to authenticated
  with check (
    exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role in ('owner', 'doctor')
        and is_active = true
    )
  );

-- Department members and the ordering doctor can update (e.g., mark as done)
drop policy if exists "dept_orders_update" on public.department_orders;
create policy "dept_orders_update"
  on public.department_orders for update to authenticated
  using (
    -- The ordering doctor
    ordered_by_member_id in (
      select id from public.clinic_members where doctor_id = auth.uid()
    )
    -- Or the department member
    or exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role = department_type
        and is_active = true
    )
    -- Or admin/owner
    or public.is_clinic_admin(organization_id)
  );

-- ════════════════════════════════════════════════════════════
-- 4. TRIGGER: updated_at
-- ════════════════════════════════════════════════════════════

drop trigger if exists trg_dept_orders_updated_at on public.department_orders;
create trigger trg_dept_orders_updated_at
  before update on public.department_orders
  for each row execute function public.bump_updated_at();

commit;
