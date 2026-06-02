-- 007_cash_shifts.sql
-- Crea tabla para el control de turnos de caja aislados.

create table if not exists public.cash_shifts (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  initial_amount  numeric(10,2) not null default 0,
  final_amount    numeric(10,2),
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.cash_shifts enable row level security;

-- Policies for cash_shifts
drop policy if exists "Usuarios pueden ver turnos de su clínica" on public.cash_shifts;
create policy "Usuarios pueden ver turnos de su clínica"
  on public.cash_shifts for select
  using (
    auth.uid() is not null
    and clinic_id = any (public.get_user_clinic_ids())
  );

drop policy if exists "Usuarios pueden insertar turnos en su clínica" on public.cash_shifts;
create policy "Usuarios pueden insertar turnos en su clínica"
  on public.cash_shifts for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and clinic_id = any (public.get_user_clinic_ids())
  );

drop policy if exists "Usuarios pueden actualizar sus propios turnos" on public.cash_shifts;
create policy "Usuarios pueden actualizar sus propios turnos"
  on public.cash_shifts for update
  using (
    auth.uid() = user_id
    and clinic_id = any (public.get_user_clinic_ids())
  );

-- Indexes
create index if not exists idx_cash_shifts_tenant on public.cash_shifts (clinic_id, user_id, status);

-- Añadir shift_id a cash_transactions
alter table public.cash_transactions
add column if not exists shift_id uuid references public.cash_shifts (id) on delete cascade;

create index if not exists idx_cash_transactions_shift on public.cash_transactions (shift_id);
