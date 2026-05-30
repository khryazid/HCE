-- ============================================================
-- 009_rbac_organizations.sql
-- RBAC Organization Architecture Migration
-- ============================================================
--
-- This migration transforms the existing clinic-based model into
-- a full RBAC organization model as specified in the project memory.
--
-- STRATEGY: Additive migration — extends existing tables in-place
-- instead of creating parallel tables. This preserves all existing
-- RLS policies and FK references.
--
-- CHANGES:
--   1. Extend clinic_members roles (8 roles)
--   2. Add is_active, custom_permissions to clinic_members
--   3. Add is_platform_admin to profiles
--   4. Create invitations table
--   5. Create doctor_settings table
--   6. Add subscription_status to clinics (org-level)
--   7. Add plan_type to clinics
--   8. Update RLS policies
--   9. Migrate existing data (admin→owner)
-- ============================================================

begin;

-- ════════════════════════════════════════════════════════════
-- 1. EXTEND clinic_members WITH NEW ROLES
-- ════════════════════════════════════════════════════════════

-- Drop the old constraint
alter table public.clinic_members
  drop constraint if exists clinic_members_role_check;

-- ── DATA MIGRATION: convert legacy 'admin' → 'owner' ──
-- Must run BEFORE the new constraint is added!
update public.clinic_members
  set role = 'owner'
  where role = 'admin';

-- Now add the expanded role set (no longer includes 'admin')
alter table public.clinic_members
  add constraint clinic_members_role_check
  check (role in (
    'owner',          -- Plan Individual: dueño de la organización
    'doctor',         -- Plan Clínica: médico invitado
    'assistant',      -- Ambos planes: hasta 2 en Individual
    'clinic_admin',   -- Plan Clínica: administrador no-médico
    'receptionist',   -- Plan Clínica: recepcionista
    'lab',            -- Plan Clínica: laboratorio
    'imaging',        -- Plan Clínica: imagenología
    'surgery'         -- Plan Clínica: cirugía
  ));

-- Add is_active column (defaults to true for existing members)
alter table public.clinic_members
  add column if not exists is_active boolean not null default true;

-- Add custom_permissions JSONB (e.g. {"can_view_patients": true})
alter table public.clinic_members
  add column if not exists custom_permissions jsonb not null default '{}'::jsonb;

-- Add invited_by_member_id (FK to clinic_members itself)
-- The existing invited_by column references auth.users — we add a new one
-- that references the member record for better traceability.
alter table public.clinic_members
  add column if not exists invited_by_member_id uuid references public.clinic_members(id) on delete set null;


-- ════════════════════════════════════════════════════════════
-- 2. ADD is_platform_admin TO profiles
-- ════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- Index for fast platform admin lookup during login
create index if not exists idx_profiles_platform_admin
  on public.profiles (doctor_id)
  where is_platform_admin = true;


-- ════════════════════════════════════════════════════════════
-- 3. EXTEND clinics TABLE (organization-level fields)
-- ════════════════════════════════════════════════════════════

-- Add plan_type to distinguish Individual vs Clínica at org level
alter table public.clinics
  add column if not exists plan_type text not null default 'individual'
  check (plan_type in ('individual', 'clinica'));

-- Add org-level subscription_status (mirrors what was on profiles)
alter table public.clinics
  add column if not exists subscription_status text default 'trial'
  check (subscription_status in ('active', 'trial', 'cancelled', 'past_due', 'paused'));

-- Add owner_user_id to track who created the organization
alter table public.clinics
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;


-- ════════════════════════════════════════════════════════════
-- 4. CREATE invitations TABLE
-- ════════════════════════════════════════════════════════════

create table if not exists public.invitations (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.clinics(id) on delete cascade,
  email                 varchar(255) not null,
  role                  text not null check (role in (
    'owner', 'doctor', 'assistant', 'clinic_admin',
    'receptionist', 'lab', 'imaging', 'surgery'
  )),
  token                 varchar(255) unique not null,
  status                text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at            timestamptz not null,
  invited_by_member_id  uuid references public.clinic_members(id) on delete set null,
  joined_at             timestamptz,
  created_at            timestamptz not null default now()
);

-- Indexes for invitations
create index if not exists idx_invitations_token
  on public.invitations (token)
  where status = 'pending';

create index if not exists idx_invitations_org
  on public.invitations (organization_id, status);

create index if not exists idx_invitations_email
  on public.invitations (email, status);

-- RLS for invitations
alter table public.invitations enable row level security;

-- Members of the org can view invitations
drop policy if exists "invitations_select" on public.invitations;
create policy "invitations_select"
  on public.invitations for select to authenticated
  using (
    organization_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid()
    )
  );

-- Only admins/owners can create invitations (write controlled by API, not RLS)
-- service_role handles inserts via the API route
drop policy if exists "invitations_insert" on public.invitations;
create policy "invitations_insert"
  on public.invitations for insert to authenticated
  with check (
    public.is_clinic_admin(organization_id)
    or exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role = 'owner'
    )
  );

-- Only admins/owners can update invitation status
drop policy if exists "invitations_update" on public.invitations;
create policy "invitations_update"
  on public.invitations for update to authenticated
  using (
    public.is_clinic_admin(organization_id)
    or exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role = 'owner'
    )
  );

-- Trigger for updated_at on invitations (not needed — no updated_at column)

-- ════════════════════════════════════════════════════════════
-- 5. CREATE doctor_settings TABLE
-- ════════════════════════════════════════════════════════════

create table if not exists public.doctor_settings (
  id                            uuid primary key default gen_random_uuid(),
  member_id                     uuid not null unique references public.clinic_members(id) on delete cascade,
  organization_id               uuid not null references public.clinics(id) on delete cascade,
  receptionist_enabled          boolean not null default false,
  vacation_mode                 boolean not null default false,
  vacation_redirect_member_id   uuid references public.clinic_members(id) on delete set null,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index if not exists idx_doctor_settings_member
  on public.doctor_settings (member_id);

create index if not exists idx_doctor_settings_org
  on public.doctor_settings (organization_id);

-- RLS for doctor_settings
alter table public.doctor_settings enable row level security;

-- Members of the org can read doctor_settings
drop policy if exists "doctor_settings_select" on public.doctor_settings;
create policy "doctor_settings_select"
  on public.doctor_settings for select to authenticated
  using (
    organization_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid()
    )
  );

-- Only the doctor themselves or an admin/owner can modify settings
drop policy if exists "doctor_settings_write" on public.doctor_settings;
create policy "doctor_settings_write"
  on public.doctor_settings for all to authenticated
  using (
    -- Own settings
    member_id in (
      select id from public.clinic_members where doctor_id = auth.uid()
    )
    -- Or admin/owner of the org
    or public.is_clinic_admin(organization_id)
    or exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role = 'owner'
    )
  )
  with check (
    member_id in (
      select id from public.clinic_members where doctor_id = auth.uid()
    )
    or public.is_clinic_admin(organization_id)
    or exists (
      select 1 from public.clinic_members
      where clinic_id = organization_id
        and doctor_id = auth.uid()
        and role = 'owner'
    )
  );

-- Trigger for updated_at
drop trigger if exists trg_doctor_settings_updated_at on public.doctor_settings;
create trigger trg_doctor_settings_updated_at
  before update on public.doctor_settings
  for each row execute function public.bump_updated_at();


-- ════════════════════════════════════════════════════════════
-- 6. UPDATE HELPER FUNCTIONS FOR NEW ROLES
-- ════════════════════════════════════════════════════════════

-- Extend is_clinic_admin to also recognize 'owner' role
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
      and role in ('owner', 'clinic_admin')
      and is_active = true
  );
$$;

-- New helper: check if user is org owner
create or replace function public.is_org_owner(check_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = check_clinic_id
      and doctor_id = auth.uid()
      and role = 'owner'
      and is_active = true
  );
$$;

-- Update is_clinic_member to check is_active
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
      and is_active = true
  );
$$;

-- New helper: check user's role in an organization
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

-- New helper: check if user is platform admin
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where doctor_id = auth.uid()
      and is_platform_admin = true
  );
$$;


-- ════════════════════════════════════════════════════════════
-- 7. DATA MIGRATION: admin → owner
-- ════════════════════════════════════════════════════════════

-- Migrate existing 'admin' role to 'owner' in clinic_members
-- This is the user who created the organization
update public.clinic_members
  set role = 'owner'
  where role = 'admin';

-- Set owner_user_id on clinics from the first profile created for each clinic
update public.clinics c
  set owner_user_id = (
    select p.doctor_id
    from public.profiles p
    where p.clinic_id = c.id
    order by p.created_at asc
    limit 1
  )
  where c.owner_user_id is null;

-- Migrate plan from profiles to clinics.plan_type
update public.clinics c
  set plan_type = case
    when (select p.plan from public.profiles p where p.clinic_id = c.id order by p.created_at asc limit 1) = 'clinic'
    then 'clinica'
    else 'individual'
  end
  where c.plan_type = 'individual'; -- only update defaults

-- Migrate subscription_status from profiles to clinics
update public.clinics c
  set subscription_status = (
    select case p.subscription_status
      when 'trialing' then 'trial'
      when 'active' then 'active'
      when 'canceled' then 'cancelled'
      when 'past_due' then 'past_due'
      when 'paused' then 'paused'
      else 'trial'
    end
    from public.profiles p
    where p.clinic_id = c.id
    order by p.created_at asc
    limit 1
  )
  where c.subscription_status = 'trial'; -- only update defaults


-- ════════════════════════════════════════════════════════════
-- 8. FUNCTION: validate_invitation_token
-- ════════════════════════════════════════════════════════════

-- Used by the invitation acceptance flow
drop function if exists public.validate_invitation_token(text);
create or replace function public.validate_invitation_token(p_token text)
returns table (
  invitation_id uuid,
  organization_id uuid,
  email varchar,
  role text,
  status text,
  expires_at timestamptz,
  organization_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      i.id as invitation_id,
      i.organization_id,
      i.email,
      i.role,
      i.status,
      i.expires_at,
      c.name as organization_name
    from public.invitations i
    join public.clinics c on c.id = i.organization_id
    where i.token = p_token
    limit 1;
end;
$$;


-- ════════════════════════════════════════════════════════════
-- 9. CRON: Expire old invitations
-- ════════════════════════════════════════════════════════════
-- NOTE: This requires pg_cron extension. If not available,
-- handle expiration in the application layer.

-- Auto-expire invitations past their expires_at
create or replace function public.expire_old_invitations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invitations
    set status = 'expired'
    where status = 'pending'
      and expires_at < now();
end;
$$;


commit;
