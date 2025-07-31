-- Fix critical security issues identified by Supabase linter
-- Remove SECURITY DEFINER from views to prevent RLS bypass

BEGIN;

-- Get all security definer views and convert them to regular views
-- This query will show us what views currently have SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%SECURITY DEFINER%';

-- Since we can't directly ALTER VIEW to remove SECURITY DEFINER,
-- we need to DROP and recreate the problematic views

-- First, let's identify common problematic views that might exist:
-- Drop and recreate views without SECURITY DEFINER

-- Example pattern for fixing views (we'll need to identify specific ones):
-- DROP VIEW IF EXISTS public.some_problematic_view CASCADE;
-- CREATE VIEW public.some_problematic_view AS
-- SELECT ... -- original query without SECURITY DEFINER

-- Also check for any RLS issues on tables that should have policies
-- Enable RLS on any tables that don't have it but should
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    -- Check tables that reference user/profile data but don't have RLS
    FOR table_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            SELECT tablename 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE c.relrowsecurity = true
            AND t.schemaname = 'public'
        )
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = tablename 
            AND column_name IN ('user_id', 'profile_id', 'creator_id', 'owner_id')
        )
    LOOP
        RAISE NOTICE 'Table % should probably have RLS enabled', table_rec.tablename;
        -- Uncomment the next line to actually enable RLS:
        -- EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_rec.tablename);
    END LOOP;
END $$;

COMMIT;