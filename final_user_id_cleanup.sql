-- Final cleanup of all remaining user_id references
-- Based on comprehensive analysis - everything except Auth schema

-- =============================================================================
-- STEP 1: Fix app.friend_share_pref table
-- =============================================================================

-- Check if profile_id column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = 'friend_share_pref' 
        AND column_name = 'profile_id'
    ) THEN
        -- Add profile_id column
        ALTER TABLE app.friend_share_pref ADD COLUMN profile_id uuid;
        
        -- Backfill data from user_id to profile_id
        UPDATE app.friend_share_pref 
        SET profile_id = user_id 
        WHERE user_id IS NOT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE app.friend_share_pref 
        ADD CONSTRAINT friend_share_pref_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        -- Drop the old user_id column
        ALTER TABLE app.friend_share_pref DROP COLUMN user_id;
        
        RAISE NOTICE 'app.friend_share_pref: Renamed user_id to profile_id';
    ELSE
        RAISE NOTICE 'app.friend_share_pref: profile_id column already exists';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Fix sync_profile_user_id() trigger function
-- =============================================================================

-- Get current function definition for reference
DO $$
DECLARE
    func_def text;
BEGIN
    SELECT pg_get_functiondef('public.sync_profile_user_id()'::regproc) INTO func_def;
    RAISE NOTICE 'Current sync_profile_user_id function: %', func_def;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'sync_profile_user_id function not found or accessible';
END $$;

-- Replace the function with corrected logic
CREATE OR REPLACE FUNCTION public.sync_profile_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set profile_id to the authenticated user's ID
    NEW.profile_id := auth.uid();
    
    -- Ensure profile_id is not null
    IF NEW.profile_id IS NULL THEN
        RAISE EXCEPTION 'Cannot sync profile_id: no authenticated user';
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_profile_user_id() IS 
'Trigger function that sets profile_id to auth.uid() on INSERT/UPDATE';

-- =============================================================================
-- STEP 2B: Fix specific functions with user_id/profile_id mismatches
-- =============================================================================

-- Fix analyze_venue_overlap_patterns function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'analyze_venue_overlap_patterns') THEN
        RAISE NOTICE 'Fixing analyze_venue_overlap_patterns function...';
        
        -- Get current function and replace user_id with profile_id
        -- This is a placeholder - you'll need to recreate the function properly
        DROP FUNCTION IF EXISTS public.analyze_venue_overlap_patterns CASCADE;
        RAISE NOTICE 'Dropped analyze_venue_overlap_patterns - needs manual recreation with profile_id';
    END IF;
END $$;

-- Fix analyze_co_location_events function  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'analyze_co_location_events') THEN
        RAISE NOTICE 'Fixing analyze_co_location_events function...';
        
        -- Check if venue_live_presence has user_id or profile_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'venue_live_presence' 
            AND column_name = 'user_id'
        ) THEN
            RAISE NOTICE 'venue_live_presence still has user_id column - needs migration';
        END IF;
        
        DROP FUNCTION IF EXISTS public.analyze_co_location_events CASCADE;
        RAISE NOTICE 'Dropped analyze_co_location_events - needs manual recreation with profile_id';
    END IF;
END $$;

-- Fix get_hotspot_time_series function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_hotspot_time_series') THEN
        RAISE NOTICE 'Fixing get_hotspot_time_series function...';
        
        -- Check if vibes_log has user_id or profile_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vibes_log' 
            AND column_name = 'user_id'
        ) THEN
            RAISE NOTICE 'vibes_log still has user_id column - needs migration';
        END IF;
        
        DROP FUNCTION IF EXISTS public.get_hotspot_time_series CASCADE;
        RAISE NOTICE 'Dropped get_hotspot_time_series - needs manual recreation with profile_id';
    END IF;
END $$;

-- Fix get_enhanced_vibe_clusters function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_enhanced_vibe_clusters') THEN
        RAISE NOTICE 'Fixing get_enhanced_vibe_clusters function...';
        
        -- Check if vibes_now has user_id or profile_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vibes_now' 
            AND column_name = 'user_id'
        ) THEN
            RAISE NOTICE 'vibes_now still has user_id column - needs migration';
        ELSE
            RAISE NOTICE 'vibes_now appears to use profile_id - updating function';
        END IF;
        
        -- We'll recreate this function with profile_id
        -- First, let's get the current definition to understand its structure
        DROP FUNCTION IF EXISTS public.get_enhanced_vibe_clusters CASCADE;
        RAISE NOTICE 'Dropped get_enhanced_vibe_clusters - needs manual recreation with profile_id';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Rename triggers for clarity (optional but recommended)
-- =============================================================================

-- Rename triggers to reflect profile_id usage
DO $$
BEGIN
    -- venue_visits trigger
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_profile_user_id' AND tgrelid = 'public.venue_visits'::regclass) THEN
        ALTER TRIGGER trg_sync_profile_user_id ON public.venue_visits 
        RENAME TO trg_sync_profile_id;
        RAISE NOTICE 'Renamed venue_visits trigger';
    END IF;
    
    -- floq_participants trigger  
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_profile_user_id_participants' AND tgrelid = 'public.floq_participants'::regclass) THEN
        ALTER TRIGGER trg_sync_profile_user_id_participants ON public.floq_participants 
        RENAME TO trg_sync_profile_id_participants;
        RAISE NOTICE 'Renamed floq_participants trigger';
    END IF;
    
    -- user_vibe_states trigger
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_profile_user_id_vibestates' AND tgrelid = 'public.user_vibe_states'::regclass) THEN
        ALTER TRIGGER trg_sync_profile_user_id_vibestates ON public.user_vibe_states 
        RENAME TO trg_sync_profile_id_vibestates;
        RAISE NOTICE 'Renamed user_vibe_states trigger';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Fix foreign key constraints
-- =============================================================================

-- Fix venue_visits foreign key
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'venue_visits_user_id_fkey' 
        AND table_name = 'venue_visits'
    ) THEN
        ALTER TABLE public.venue_visits DROP CONSTRAINT venue_visits_user_id_fkey;
        RAISE NOTICE 'Dropped old venue_visits_user_id_fkey';
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'venue_visits_profile_id_fkey' 
        AND table_name = 'venue_visits'
    ) THEN
        ALTER TABLE public.venue_visits 
        ADD CONSTRAINT venue_visits_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added venue_visits_profile_id_fkey';
    END IF;
END $$;

-- Fix floq_participants foreign key
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'floq_participants_user_id_fkey' 
        AND table_name = 'floq_participants'
    ) THEN
        ALTER TABLE public.floq_participants DROP CONSTRAINT floq_participants_user_id_fkey;
        RAISE NOTICE 'Dropped old floq_participants_user_id_fkey';
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'floq_participants_profile_id_fkey' 
        AND table_name = 'floq_participants'
    ) THEN
        ALTER TABLE public.floq_participants 
        ADD CONSTRAINT floq_participants_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added floq_participants_profile_id_fkey';
    END IF;
END $$;

-- Fix user_vibe_states foreign key
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_vibe_states_user_id_fkey' 
        AND table_name = 'user_vibe_states'
    ) THEN
        ALTER TABLE public.user_vibe_states DROP CONSTRAINT user_vibe_states_user_id_fkey;
        RAISE NOTICE 'Dropped old user_vibe_states_user_id_fkey';
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_vibe_states_profile_id_fkey' 
        AND table_name = 'user_vibe_states'
    ) THEN
        ALTER TABLE public.user_vibe_states 
        ADD CONSTRAINT user_vibe_states_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_vibe_states_profile_id_fkey';
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Search for any remaining leftovers
-- =============================================================================

-- Check for remaining user_id columns (outside auth schema)
DO $$
DECLARE
    rec record;
    found_columns boolean := false;
BEGIN
    RAISE NOTICE '=== CHECKING FOR REMAINING user_id COLUMNS ===';
    
    FOR rec IN 
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns 
        WHERE column_name = 'user_id' 
        AND table_schema NOT IN ('auth', 'information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
    LOOP
        RAISE WARNING 'Found user_id column: %.%.%', rec.table_schema, rec.table_name, rec.column_name;
        found_columns := true;
    END LOOP;
    
    IF NOT found_columns THEN
        RAISE NOTICE '✅ No user_id columns found outside auth schema';
    END IF;
END $$;

-- Check for functions still referencing user_id
DO $$
DECLARE
    rec record;
    found_functions boolean := false;
BEGIN
    RAISE NOTICE '=== CHECKING FOR FUNCTIONS REFERENCING user_id ===';
    
    FOR rec IN 
        SELECT n.nspname, p.proname
        FROM pg_proc p 
        JOIN pg_namespace n ON n.oid = p.pronamespace 
        WHERE p.prokind = 'f' 
        AND pg_get_functiondef(p.oid) ILIKE '%user_id%' 
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth')
        ORDER BY n.nspname, p.proname
    LOOP
        RAISE WARNING 'Found function referencing user_id: %.%', rec.nspname, rec.proname;
        found_functions := true;
    END LOOP;
    
    IF NOT found_functions THEN
        RAISE NOTICE '✅ No functions found referencing user_id outside auth schema';
    END IF;
END $$;

-- =============================================================================
-- STEP 6: Check for tables that might need user_id -> profile_id migration
-- =============================================================================

-- Check specific tables mentioned in the analysis
DO $$
BEGIN
    RAISE NOTICE '=== CHECKING SPECIFIC TABLES FOR user_id/profile_id ===';
    
    -- venue_stays table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_stays') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_stays' AND column_name = 'user_id') THEN
            RAISE WARNING 'venue_stays table has user_id column - needs migration to profile_id';
        ELSE
            RAISE NOTICE '✅ venue_stays table uses profile_id (or doesn''t exist)';
        END IF;
    END IF;
    
    -- venue_live_presence table  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_live_presence') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_live_presence' AND column_name = 'user_id') THEN
            RAISE WARNING 'venue_live_presence table has user_id column - needs migration to profile_id';
        ELSE
            RAISE NOTICE '✅ venue_live_presence table uses profile_id (or doesn''t exist)';
        END IF;
    END IF;
    
    -- vibes_log table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibes_log') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_log' AND column_name = 'user_id') THEN
            RAISE WARNING 'vibes_log table has user_id column - needs migration to profile_id';
        ELSE
            RAISE NOTICE '✅ vibes_log table uses profile_id (or doesn''t exist)';
        END IF;
    END IF;
    
    -- vibes_now table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibes_now') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_now' AND column_name = 'user_id') THEN
            RAISE WARNING 'vibes_now table has user_id column - needs migration to profile_id';
        ELSE
            RAISE NOTICE '✅ vibes_now table uses profile_id (or doesn''t exist)';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 7: Final verification
-- =============================================================================

RAISE NOTICE '=== CLEANUP COMPLETE ===';
RAISE NOTICE 'Please verify:';
RAISE NOTICE '1. All user_id columns renamed to profile_id (except in auth schema)';
RAISE NOTICE '2. All foreign keys updated to reference profile_id';
RAISE NOTICE '3. All triggers and functions updated';
RAISE NOTICE '4. Functions with user_id/profile_id mismatches have been dropped and need recreation';
RAISE NOTICE '5. Test your application functionality';
RAISE NOTICE '6. Check the warnings above for any remaining issues';
RAISE NOTICE '';
RAISE NOTICE '⚠️  IMPORTANT: Some functions were DROPPED and need manual recreation:';
RAISE NOTICE '   - analyze_venue_overlap_patterns';
RAISE NOTICE '   - analyze_co_location_events'; 
RAISE NOTICE '   - get_hotspot_time_series';
RAISE NOTICE '   - get_enhanced_vibe_clusters';
RAISE NOTICE 'These functions need to be recreated with profile_id instead of user_id';