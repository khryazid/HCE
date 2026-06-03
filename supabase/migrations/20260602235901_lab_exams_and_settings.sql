-- Migration: Add lab_exams and clinic_settings tables

begin;

-- Catálogo de exámenes de laboratorio
create table if not exists public.lab_exams (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  category        text not null default 'Laboratorio Clínico'
    check (category in ('Laboratorio Clínico', 'Imagenología', 'Genética', 'Patología', 'Otro')),
  name            text not null,
  default_price   numeric(10, 2) not null default 0.00,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Habilitar RLS para lab_exams
alter table public.lab_exams enable row level security;

-- Políticas para lab_exams
drop policy if exists "Usuarios de clínica pueden ver exámenes" on public.lab_exams;
create policy "Usuarios de clínica pueden ver exámenes"
  on public.lab_exams for select
  using (
    clinic_id in (
      select clinic_id from public.clinic_members
      where doctor_id = auth.uid() and is_active = true
    )
  );

drop policy if exists "Usuarios de clínica pueden gestionar exámenes" on public.lab_exams;
create policy "Usuarios de clínica pueden gestionar exámenes"
  on public.lab_exams for all
  using (
    clinic_id in (
      select clinic_id from public.clinic_members
      where doctor_id = auth.uid() and is_active = true
    )
  );


-- Configuraciones de la Clínica (Membrete, etc)
create table if not exists public.clinic_settings (
  clinic_id             uuid primary key references public.clinics (id) on delete cascade,
  lab_letterhead_url    text,
  lab_footer_text       text,
  updated_at            timestamptz not null default now()
);

-- Habilitar RLS para clinic_settings
alter table public.clinic_settings enable row level security;

-- Políticas para clinic_settings
drop policy if exists "Usuarios pueden ver configuraciones de su clínica" on public.clinic_settings;
create policy "Usuarios pueden ver configuraciones de su clínica"
  on public.clinic_settings for select
  using (
    clinic_id in (
      select clinic_id from public.clinic_members
      where doctor_id = auth.uid() and is_active = true
    )
  );

drop policy if exists "Usuarios pueden actualizar configuraciones de su clínica" on public.clinic_settings;
create policy "Usuarios pueden actualizar configuraciones de su clínica"
  on public.clinic_settings for all
  using (
    clinic_id in (
      select clinic_id from public.clinic_members
      where doctor_id = auth.uid() and is_active = true
    )
  );

commit;
