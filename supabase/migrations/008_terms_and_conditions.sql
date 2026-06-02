-- Migration 008: Add terms acceptance tracking

-- Add terms tracking to profiles
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz default null,
  add column if not exists terms_version text default null;

-- Add terms tracking to clinic_members
alter table public.clinic_members
  add column if not exists terms_accepted_at timestamptz default null,
  add column if not exists terms_version text default null;
