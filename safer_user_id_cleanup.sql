-- SAFER cleanup of remaining user_id references
-- This version fixes functions in place instead of dropping them

-- =============================================================================
-- STEP 1: Fix app.friend_share_pref table (SAFE)
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
-- STEP 2: Fix sync_profile_user_id() trigger function (SAFE)
-- =============================================================================

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

-- =============================================================================
-- STEP 3: Check what tables exist and what columns they have (DIAGNOSTIC ONLY)
-- =============================================================================

DO $$
DECLARE
    rec record;
BEGIN
    RAISE NOTICE '=== TABLE ANALYSIS FOR FUNCTION FIXES ===';
    
    -- Check venue_stays table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_stays') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_stays' AND column_name = 'user_id') THEN
            RAISE NOTICE 'venue_stays: HAS user_id column (analyze_venue_overlap_patterns needs this)';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_stays' AND column_name = 'profile_id') THEN
            RAISE NOTICE 'venue_stays: HAS profile_id column (analyze_venue_overlap_patterns needs updating)';
        ELSE
            RAISE NOTICE 'venue_stays: EXISTS but no user_id or profile_id found';
        END IF;
    ELSE
        RAISE NOTICE 'venue_stays: TABLE DOES NOT EXIST';
    END IF;
    
    -- Check venue_live_presence table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_live_presence') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_live_presence' AND column_name = 'user_id') THEN
            RAISE NOTICE 'venue_live_presence: HAS user_id column (analyze_co_location_events needs this)';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_live_presence' AND column_name = 'profile_id') THEN
            RAISE NOTICE 'venue_live_presence: HAS profile_id column (analyze_co_location_events needs updating)';
        ELSE
            RAISE NOTICE 'venue_live_presence: EXISTS but no user_id or profile_id found';
        END IF;
    ELSE
        RAISE NOTICE 'venue_live_presence: TABLE DOES NOT EXIST';
    END IF;
    
    -- Check vibes_log table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibes_log') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_log' AND column_name = 'user_id') THEN
            RAISE NOTICE 'vibes_log: HAS user_id column (get_hotspot_time_series needs this)';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_log' AND column_name = 'profile_id') THEN
            RAISE NOTICE 'vibes_log: HAS profile_id column (get_hotspot_time_series needs updating)';
        ELSE
            RAISE NOTICE 'vibes_log: EXISTS but no user_id or profile_id found';
        END IF;
    ELSE
        RAISE NOTICE 'vibes_log: TABLE DOES NOT EXIST';
    END IF;
    
    -- Check vibes_now table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibes_now') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_now' AND column_name = 'user_id') THEN
            RAISE NOTICE 'vibes_now: HAS user_id column (get_enhanced_vibe_clusters needs this)';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_now' AND column_name = 'profile_id') THEN
            RAISE NOTICE 'vibes_now: HAS profile_id column (get_enhanced_vibe_clusters needs updating)';
        ELSE
            RAISE NOTICE 'vibes_now: EXISTS but no user_id or profile_id found';
        END IF;
    ELSE
        RAISE NOTICE 'vibes_now: TABLE DOES NOT EXIST';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Check which functions exist (DIAGNOSTIC ONLY)
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== FUNCTION EXISTENCE CHECK ===';
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'analyze_venue_overlap_patterns') THEN
        RAISE NOTICE 'analyze_venue_overlap_patterns: EXISTS (used by FriendDetectionEngine)';
    ELSE
        RAISE NOTICE 'analyze_venue_overlap_patterns: DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'analyze_co_location_events') THEN
        RAISE NOTICE 'analyze_co_location_events: EXISTS (used by FriendDetectionEngine)';
    ELSE
        RAISE NOTICE 'analyze_co_location_events: DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_hotspot_time_series') THEN
        RAISE NOTICE 'get_hotspot_time_series: EXISTS (used by get_hotspots edge function)';
    ELSE
        RAISE NOTICE 'get_hotspot_time_series: DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_enhanced_vibe_clusters') THEN
        RAISE NOTICE 'get_enhanced_vibe_clusters: EXISTS (used by get_hotspots edge function)';
    ELSE
        RAISE NOTICE 'get_enhanced_vibe_clusters: DOES NOT EXIST';
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Fix foreign key constraints (SAFE)
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
-- STEP 6: Final safety checks
-- =============================================================================

-- Check for remaining user_id columns (outside auth schema)
DO $$
DECLARE
    rec record;
    found_columns boolean := false;
BEGIN
    RAISE NOTICE '=== FINAL SAFETY CHECK ===';
    
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

RAISE NOTICE '=== SAFER CLEANUP COMPLETE ===';
RAISE NOTICE 'This script only fixed:';
RAISE NOTICE '1. app.friend_share_pref table migration';
RAISE NOTICE '2. sync_profile_user_id() trigger function';
RAISE NOTICE '3. Foreign key constraints';
RAISE NOTICE '';
RAISE NOTICE '⚠️  FUNCTIONS WITH user_id REFERENCES WERE NOT TOUCHED';
RAISE NOTICE 'Check the diagnostic output above to see which functions need manual fixes';
RAISE NOTICE 'Only fix functions after confirming table schema matches expectations';