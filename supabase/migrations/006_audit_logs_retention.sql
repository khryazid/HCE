-- Migration: Create retention policy for audit_logs
-- Objective: Delete logs older than 90 days to prevent the table from growing indefinitely

create extension if not exists pg_cron;

select cron.schedule(
  'cleanup-audit-logs',
  '0 0 * * *', -- Run every day at midnight
  $$ delete from public.audit_logs where created_at < now() - interval '90 days' $$
);
