-- Migration: Super Templates
-- Description: Adds a JSONB column to treatment_templates to store diet, measures, nursing cares, labs, etc.

ALTER TABLE public.treatment_templates
ADD COLUMN IF NOT EXISTS extra_sections jsonb NOT NULL DEFAULT '{}'::jsonb;
