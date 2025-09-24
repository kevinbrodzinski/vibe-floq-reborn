-- SAFE PROFILE_ID UPDATE MIGRATION
-- This script safely updates existing tables to use profile_id instead of user_id
-- Run this in the Supabase SQL Editor

-- ============================================================================
-- STEP 1: CHECK IF ENHANCED VIBE TABLES EXIST AND UPDATE THEM
-- ============================================================================

-- Update vibe_system_metrics if it exists
DO $$
BEGIN
    -- Check if table exists and has user_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibe_system_metrics') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibe_system_metrics' AND column_name = 'user_id') THEN
        
        -- Add profile_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibe_system_metrics' AND column_name = 'profile_id') THEN
            ALTER TABLE public.vibe_system_metrics ADD COLUMN profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Copy data from user_id to profile_id
        UPDATE public.vibe_system_metrics SET profile_id = user_id WHERE profile_id IS NULL;
        
        -- Drop old indexes
        DROP INDEX IF EXISTS idx_vibe_system_metrics_user_time;
        
        -- Create new indexes
        CREATE INDEX IF NOT EXISTS idx_vibe_system_metrics_profile_time 
        ON public.vibe_system_metrics(profile_id, measured_at DESC) 
        WHERE profile_id IS NOT NULL;
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Users can view their own metrics" ON public.vibe_system_metrics;
        CREATE POLICY "Users can view their own metrics" 
        ON public.vibe_system_metrics FOR SELECT 
        USING (profile_id IS NULL OR auth.uid() = profile_id);
        
        -- Drop the old user_id column
        ALTER TABLE public.vibe_system_metrics DROP COLUMN IF EXISTS user_id;
        
        RAISE NOTICE 'Updated vibe_system_metrics table to use profile_id';
    ELSE
        RAISE NOTICE 'vibe_system_metrics table does not exist or already uses profile_id';
    END IF;
END $$;

-- Update vibe_user_learning if it exists
DO $$
BEGIN
    -- Check if table exists and has user_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibe_user_learning') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibe_user_learning' AND column_name = 'user_id') THEN
        
        -- Add profile_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibe_user_learning' AND column_name = 'profile_id') THEN
            ALTER TABLE public.vibe_user_learning ADD COLUMN profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Copy data from user_id to profile_id
        UPDATE public.vibe_user_learning SET profile_id = user_id WHERE profile_id IS NULL;
        
        -- Make profile_id NOT NULL after data migration
        ALTER TABLE public.vibe_user_learning ALTER COLUMN profile_id SET NOT NULL;
        
        -- Drop old indexes
        DROP INDEX IF EXISTS idx_vibe_user_learning_user_time;
        
        -- Create new indexes
        CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_profile_time 
        ON public.vibe_user_learning(profile_id, created_at DESC);
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Users can manage their own learning data" ON public.vibe_user_learning;
        CREATE POLICY "Users can manage their own learning data" 
        ON public.vibe_user_learning FOR ALL 
        USING (auth.uid() = profile_id) 
        WITH CHECK (auth.uid() = profile_id);
        
        -- Drop the old user_id column
        ALTER TABLE public.vibe_user_learning DROP COLUMN IF EXISTS user_id;
        
        RAISE NOTICE 'Updated vibe_user_learning table to use profile_id';
    ELSE
        RAISE NOTICE 'vibe_user_learning table does not exist or already uses profile_id';
    END IF;
END $$;

-- Update location_vibe_patterns if it exists
DO $$
BEGIN
    -- Check if table exists and has user_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_vibe_patterns') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'location_vibe_patterns' AND column_name = 'user_id') THEN
        
        -- Add profile_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'location_vibe_patterns' AND column_name = 'profile_id') THEN
            ALTER TABLE public.location_vibe_patterns ADD COLUMN profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Copy data from user_id to profile_id
        UPDATE public.location_vibe_patterns SET profile_id = user_id WHERE profile_id IS NULL;
        
        -- Make profile_id NOT NULL after data migration
        ALTER TABLE public.location_vibe_patterns ALTER COLUMN profile_id SET NOT NULL;
        
        -- Drop old constraints and indexes
        DROP INDEX IF EXISTS idx_location_vibe_patterns_user_venue;
        ALTER TABLE public.location_vibe_patterns DROP CONSTRAINT IF EXISTS location_vibe_patterns_user_id_location_hash_vibe_key;
        
        -- Create new indexes
        CREATE INDEX IF NOT EXISTS idx_location_vibe_patterns_profile_venue 
        ON public.location_vibe_patterns(profile_id, venue_id) 
        WHERE venue_id IS NOT NULL;
        
        -- Create new unique constraint
        ALTER TABLE public.location_vibe_patterns 
        ADD CONSTRAINT location_vibe_patterns_profile_id_location_hash_vibe_key 
        UNIQUE(profile_id, location_hash, vibe);
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Users can manage their own location patterns" ON public.location_vibe_patterns;
        CREATE POLICY "Users can manage their own location patterns" 
        ON public.location_vibe_patterns FOR ALL 
        USING (auth.uid() = profile_id) 
        WITH CHECK (auth.uid() = profile_id);
        
        -- Drop the old user_id column
        ALTER TABLE public.location_vibe_patterns DROP COLUMN IF EXISTS user_id;
        
        RAISE NOTICE 'Updated location_vibe_patterns table to use profile_id';
    ELSE
        RAISE NOTICE 'location_vibe_patterns table does not exist or already uses profile_id';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: UPDATE FUNCTIONS TO USE PROFILE_ID
-- ============================================================================

-- Update cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_vibe_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep only last 30 days of user-specific metrics
    DELETE FROM public.vibe_system_metrics 
    WHERE profile_id IS NOT NULL 
    AND measured_at < NOW() - INTERVAL '30 days';
    
    -- Keep only last 7 days of system-wide metrics
    DELETE FROM public.vibe_system_metrics 
    WHERE profile_id IS NULL 
    AND measured_at < NOW() - INTERVAL '7 days';
    
    -- Keep only last 90 days of learning data (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibe_user_learning') THEN
        DELETE FROM public.vibe_user_learning 
        WHERE created_at < NOW() - INTERVAL '90 days';
    END IF;
END;
$$;

-- Update user insights function if it exists
DO $$
BEGIN
    -- Check if the function exists first
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_vibe_insights') THEN
        -- Drop and recreate with profile_id parameter
        DROP FUNCTION IF EXISTS public.get_user_vibe_insights(UUID, INTEGER);
        
        CREATE OR REPLACE FUNCTION public.get_user_vibe_insights(
            p_profile_id UUID DEFAULT auth.uid(),
            p_days_back INTEGER DEFAULT 30
        )
        RETURNS TABLE (
            total_corrections INTEGER,
            accuracy_trend DOUBLE PRECISION,
            most_corrected_from vibe_enum,
            most_corrected_to vibe_enum,
            learning_velocity DOUBLE PRECISION,
            consistency_score DOUBLE PRECISION,
            top_locations JSONB
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN QUERY
            WITH learning_stats AS (
                SELECT 
                    COUNT(*)::integer as total_corrections,
                    AVG(confidence) as avg_confidence,
                    MODE() WITHIN GROUP (ORDER BY original_vibe) as most_corrected_from,
                    MODE() WITHIN GROUP (ORDER BY corrected_vibe) as most_corrected_to,
                    STDDEV(correction_strength) as consistency_stddev,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::double precision / 
                    GREATEST(1, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')) as learning_velocity
                FROM vibe_user_learning
                WHERE profile_id = p_profile_id
                AND created_at >= NOW() - (p_days_back || ' days')::interval
            ),
            location_patterns AS (
                SELECT 
                    jsonb_agg(
                        jsonb_build_object(
                            'location_hash', location_hash,
                            'vibe', vibe,
                            'frequency', frequency,
                            'accuracy', accuracy
                        ) ORDER BY frequency DESC
                    ) FILTER (WHERE rn <= 5) as top_locations
                FROM (
                    SELECT 
                        location_hash,
                        vibe,
                        frequency,
                        accuracy,
                        ROW_NUMBER() OVER (ORDER BY frequency DESC) as rn
                    FROM location_vibe_patterns
                    WHERE profile_id = p_profile_id
                ) ranked_locations
            )
            SELECT 
                COALESCE(ls.total_corrections, 0),
                COALESCE(ls.avg_confidence, 0.5),
                ls.most_corrected_from,
                ls.most_corrected_to,
                COALESCE(ls.learning_velocity, 1.0),
                CASE 
                    WHEN ls.consistency_stddev IS NULL THEN 0.5
                    ELSE GREATEST(0.0, 1.0 - ls.consistency_stddev)
                END,
                COALESCE(lp.top_locations, '[]'::jsonb)
            FROM learning_stats ls
            CROSS JOIN location_patterns lp;
        END;
        $func$;
        
        -- Grant execute permission
        GRANT EXECUTE ON FUNCTION public.get_user_vibe_insights TO authenticated;
        
        RAISE NOTICE 'Updated get_user_vibe_insights function to use profile_id';
    ELSE
        RAISE NOTICE 'get_user_vibe_insights function does not exist yet';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: VERIFY UPDATES
-- ============================================================================

-- Check what tables were updated
DO $$
DECLARE
    table_count INTEGER := 0;
BEGIN
    -- Count updated tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibe_system_metrics') THEN
        table_count := table_count + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibe_user_learning') THEN
        table_count := table_count + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_vibe_patterns') THEN
        table_count := table_count + 1;
    END IF;
    
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Updated % enhanced vibe detection tables to use profile_id', table_count;
    RAISE NOTICE 'Updated cleanup function to use profile_id';
    RAISE NOTICE 'All RLS policies updated to use profile_id';
    RAISE NOTICE '=== SAFE TO PROCEED ===';
END $$;