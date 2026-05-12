begin;

-- 1. Actualizar la restricción de payment_status para incluir 'honorary'
alter table public.appointments drop constraint if exists appointments_payment_status_check;

alter table public.appointments add constraint appointments_payment_status_check
  check (payment_status in ('pending', 'paid', 'partial', 'honorary'));

-- 2. Agregar la columna para tipo de consulta si no existe
do $$ 
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema='public' and table_name='appointments' and column_name='consultation_type') then
    alter table public.appointments add column consultation_type text;
  end if;
end $$;

commit;
