-- ============================================================
-- Migration: Add subscription_expires_at to profiles
-- Run this in: Supabase → SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Optional: index for future expiry-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at
  ON public.profiles (subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;
