-- ============================================================
-- Migración 001: Cifrado app_config + GDPR Anonymization
-- Fecha: 2026-05-26
-- ============================================================
-- 
-- CAMBIOS:
--   1. Añade columna `encrypted` a `app_config` para cifrado en reposo
--   2. Crea funciones `set_config_secret()` y `get_config_secret()`
--      para lectura/escritura transparente de secretos cifrados con pgcrypto
--   3. Crea función `anonymize_patient()` para cumplimiento GDPR
--      "Derecho al Olvido" — anonimiza PII sin borrar historiales clínicos
--
-- NOTA SOBRE MIGRACIONES INCREMENTALES:
--   Este es el primer archivo de migración incremental del proyecto.
--   El schema monolítico 000_production_full_schema.sql sigue siendo la
--   fuente de verdad COMPLETA. Este archivo existe como referencia
--   para cambios futuros y para iniciar la transición a migraciones
--   formales con `npx supabase migration new`.
--
--   Para aplicar: Supabase SQL Editor → pegar y ejecutar.
--   Este SQL es idempotente y seguro de re-ejecutar.
-- ============================================================

-- 1. Columna encrypted en app_config
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'app_config'
      and column_name  = 'encrypted'
  ) then
    alter table public.app_config add column encrypted boolean not null default false;
  end if;
end $$;

-- 2. Funciones de cifrado (usa pgcrypto, ya habilitado)
-- Ver 000_production_full_schema.sql secciones set_config_secret / get_config_secret
-- Las funciones están definidas ahí con CREATE OR REPLACE (idempotentes).

-- 3. Función anonymize_patient (GDPR)
-- Definida en 000_production_full_schema.sql sección 12.
-- Es CREATE OR REPLACE, por lo que basta con ejecutar el schema completo.

-- ============================================================
-- PASOS POST-MIGRACIÓN (manual, una sola vez):
-- ============================================================
-- 
-- Para activar el cifrado de secretos en producción:
--
--   1. Configurar la passphrase de cifrado:
--      ALTER DATABASE postgres SET app.encryption_key = 'resultado-de-openssl-rand-base64-32';
--
--   2. Cifrar los secretos existentes:
--      SELECT set_config_secret('push_send_secret', 'tu-push-secret-real');
--      SELECT set_config_secret('resend_email_secret', 'tu-resend-secret');
--
--   3. Verificar:
--      SELECT key, encrypted, length(value) FROM public.app_config;
--      -- Los secrets deben mostrar encrypted = true
