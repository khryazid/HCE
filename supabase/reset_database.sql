-- ====================================================================
-- SCRIPT PARA REINICIAR LA BASE DE DATOS (DROP ALL EN PUBLIC)
-- ====================================================================
-- ADVERTENCIA: Esto borrará TODAS las tablas, funciones, vistas y tipos 
-- dentro del esquema "public".
-- Ideal para limpiar la base de datos antes de correr el SQL inicial.

DO $$ DECLARE
    r RECORD;
BEGIN
    -- 1. Eliminar todas las tablas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- 2. Eliminar todas las funciones (excepto las del sistema si estuvieran en public)
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
    ) LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar si es una función del sistema que no se puede borrar
            RAISE NOTICE 'No se pudo eliminar la función: %', r.proname;
        END;
    END LOOP;
    
    -- 3. Eliminar todas las vistas
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    
    -- 4. Eliminar todos los tipos (Enums) creados por el usuario
    FOR r IN (
        SELECT t.typname FROM pg_type t 
        JOIN pg_namespace n ON t.typnamespace = n.oid 
        WHERE n.nspname = 'public' AND t.typtype = 'e'
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;

END $$;
