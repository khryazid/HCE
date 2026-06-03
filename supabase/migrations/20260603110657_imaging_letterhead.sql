-- Migration: Add imaging_letterhead_url to clinic_settings

alter table public.clinic_settings
  add column if not exists imaging_letterhead_url text,
  add column if not exists imaging_footer_text text;
