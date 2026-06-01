-- ============================================================
-- 013_fix_referrals_grants.sql
-- Fix: GRANT permissions on referrals so Supabase type generator
-- can introspect the table. Also grants on department_orders
-- for consistency.
-- ============================================================

begin;

-- The Supabase type generator uses the anon/authenticated roles
-- to introspect tables. Without explicit GRANTs, tables created
-- outside of Supabase migrations UI don't get auto-granted.

grant select, insert, update, delete on public.referrals to authenticated;
grant select on public.referrals to anon;

grant select, insert, update, delete on public.department_orders to authenticated;
grant select on public.department_orders to anon;

commit;
