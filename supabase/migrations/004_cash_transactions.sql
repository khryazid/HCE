-- Migración 004: Caja / Cash Flow

begin;

create table if not exists public.cash_transactions (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade, -- Quien registró la transacción
  patient_id          uuid references public.patients (id) on delete set null, -- Opcional, si está vinculado a un paciente
  type                text not null check (type in ('income', 'expense')),
  amount              numeric(10, 2) not null,
  concept             text not null,
  payment_method      text not null default 'cash'
    check (payment_method in ('cash', 'card', 'transfer', 'other')),
  status              text not null default 'completed'
    check (status in ('completed', 'voided')),
  reference_code      text, -- Número de comprobante o transferencia
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.cash_transactions enable row level security;

drop policy if exists "Usuarios de la clínica pueden ver transacciones" on public.cash_transactions;
create policy "Usuarios de la clínica pueden ver transacciones"
  on public.cash_transactions for select
  using (
    auth.uid() is not null
    and clinic_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid()
    )
  );

drop policy if exists "Usuarios de la clínica pueden insertar transacciones" on public.cash_transactions;
create policy "Usuarios de la clínica pueden insertar transacciones"
  on public.cash_transactions for insert
  with check (
    auth.uid() = user_id
    and clinic_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid()
    )
  );

drop policy if exists "Usuarios de la clínica pueden anular transacciones" on public.cash_transactions;
create policy "Usuarios de la clínica pueden anular transacciones"
  on public.cash_transactions for update
  using (
    auth.uid() is not null
    and clinic_id in (
      select clinic_id from public.profiles where doctor_id = auth.uid()
      union
      select clinic_id from public.clinic_members where doctor_id = auth.uid()
    )
  );

create index if not exists idx_cash_transactions_tenant on public.cash_transactions (clinic_id, created_at desc);

commit;
