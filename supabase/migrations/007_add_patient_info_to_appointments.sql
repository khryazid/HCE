-- Migration: Add document and birth date to appointments
-- Objective: Allow saving patient document and birth date directly in the appointment to prefill the wizard later.

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS patient_document text;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS patient_birth_date date;
