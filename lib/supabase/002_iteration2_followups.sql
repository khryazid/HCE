-- Iteracion 2: seguimiento clinico y KPI materializado

create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  doctor_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  clinical_record_id uuid references public.clinical_records (id) on delete set null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_follow_up_tasks_tenant on public.follow_up_tasks (clinic_id, doctor_id, due_date);

alter table public.follow_up_tasks enable row level security;

create policy "followup_tenant_select"
  on public.follow_up_tasks
  for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "followup_tenant_write"
  on public.follow_up_tasks
  for all
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

drop trigger if exists trg_followups_updated_at on public.follow_up_tasks;
create trigger trg_followups_updated_at
before update on public.follow_up_tasks
for each row execute function public.bump_updated_at();

drop materialized view if exists public.mv_dashboard_kpis_daily;
create materialized view public.mv_dashboard_kpis_daily as
select
  clinic_id,
  doctor_id,
  date_trunc('day', created_at)::date as report_date,
  count(*) filter (where resource_type = 'clinical_records' and event_type = 'create') as consultations_created,
  count(*) filter (where resource_type = 'patients' and event_type = 'create') as patients_created
from public.audit_logs
group by clinic_id, doctor_id, date_trunc('day', created_at)::date;

create index if not exists idx_mv_dashboard_kpis_daily
  on public.mv_dashboard_kpis_daily (clinic_id, doctor_id, report_date desc);
