-- Fix Realtime events for UPDATE/DELETE on RLS-enabled tables
-- For Realtime filters to evaluate properly on columns that are not the primary key (like clinic_id),
-- Supabase requires the table's replica identity to be FULL so the old row contains the filtered column.
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
