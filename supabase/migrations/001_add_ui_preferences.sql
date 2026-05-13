-- A単ade el campo ui_preferences a profiles
alter table public.profiles
add column if not exists ui_preferences jsonb not null default '{}'::jsonb;
