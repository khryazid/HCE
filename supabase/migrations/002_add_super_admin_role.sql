-- Agregar columna is_super_admin a la tabla profiles para reemplazar la validación por string de email
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- Función RPC para verificar si el usuario actual es super admin
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where doctor_id = auth.uid()
      and is_super_admin = true
  );
$$;
