-- Improve Floq-Plan Integration - SAFE VERSION
-- This migration enhances the relationship between floqs and plans
-- It checks for table and column existence before making changes

-- =====================================================================================
-- STEP 1: DIAGNOSTIC - Check what tables and columns exist
-- =====================================================================================

DO $$
DECLARE
    floqs_exists BOOLEAN;
    floq_plans_exists BOOLEAN;
    floq_participants_exists BOOLEAN;
    plan_participants_exists BOOLEAN;
BEGIN
    -- Check if required tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'floqs'
    ) INTO floqs_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'floq_plans'
    ) INTO floq_plans_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'floq_participants'
    ) INTO floq_participants_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'plan_participants'
    ) INTO plan_participants_exists;
    
    RAISE NOTICE 'Table existence check:';
    RAISE NOTICE '  floqs: %', floqs_exists;
    RAISE NOTICE '  floq_plans: %', floq_plans_exists;
    RAISE NOTICE '  floq_participants: %', floq_participants_exists;
    RAISE NOTICE '  plan_participants: %', plan_participants_exists;
    
    -- Only proceed if all required tables exist
    IF NOT (floqs_exists AND floq_plans_exists AND floq_participants_exists AND plan_participants_exists) THEN
        RAISE WARNING 'Some required tables are missing. Skipping floq-plan integration improvements.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'All required tables exist. Proceeding with safe improvements...';
END $$;

-- =====================================================================================
-- STEP 2: SAFE INDEX CREATION (only if tables exist)
-- =====================================================================================

-- Add indexes for better floq-plan query performance (safe)
DO $$
BEGIN
    -- Only create indexes if the tables and columns exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'floq_plans' AND table_schema = 'public') THEN
        
        -- Check if floq_id column exists before creating index
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'floq_plans' AND column_name = 'floq_id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_floq_plans_floq_id_status 
            ON public.floq_plans(floq_id, status) 
            WHERE floq_id IS NOT NULL;
            RAISE NOTICE 'Created index: idx_floq_plans_floq_id_status';
        END IF;
        
        -- Check if creator_id column exists before creating index  
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'floq_plans' AND column_name = 'creator_id' AND table_schema = 'public') THEN
            CREATE INDEX IF NOT EXISTS idx_floq_plans_creator_floq 
            ON public.floq_plans(creator_id, floq_id) 
            WHERE floq_id IS NOT NULL;
            RAISE NOTICE 'Created index: idx_floq_plans_creator_floq';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'floq_plans' AND column_name = 'profile_id' AND table_schema = 'public') THEN
            -- Fallback to profile_id if creator_id doesn't exist
            CREATE INDEX IF NOT EXISTS idx_floq_plans_creator_floq 
            ON public.floq_plans(profile_id, floq_id) 
            WHERE floq_id IS NOT NULL;
            RAISE NOTICE 'Created index: idx_floq_plans_creator_floq (using profile_id)';
        END IF;
    END IF;
END $$;

-- =====================================================================================
-- STEP 3: SAFE CONSTRAINT ADDITION
-- =====================================================================================

-- Add constraint to ensure plans created within floqs have floq_id (safe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'floq_plans' AND table_schema = 'public') 
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'floq_plans' AND column_name = 'plan_mode' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'floq_plans' AND column_name = 'floq_id' AND table_schema = 'public') THEN
        
        -- Check if constraint already exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                       WHERE constraint_name = 'check_floq_plan_consistency') THEN
            ALTER TABLE public.floq_plans 
            ADD CONSTRAINT check_floq_plan_consistency 
            CHECK (plan_mode != 'group' OR floq_id IS NOT NULL);
            RAISE NOTICE 'Added constraint: check_floq_plan_consistency';
        END IF;
    ELSE
        RAISE NOTICE 'Skipping constraint creation - required columns not found';
    END IF;
END $$;

-- =====================================================================================
-- STEP 4: SAFE UTILITY FUNCTIONS (only basic ones that don't depend on specific schema)
-- =====================================================================================

-- Create a simple function to get floq plans (basic version)
CREATE OR REPLACE FUNCTION public.get_floq_plans_basic(
    p_floq_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    plan_id UUID,
    title TEXT,
    status TEXT,
    floq_id UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only proceed if floq_plans table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'floq_plans' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'floq_plans table does not exist';
    END IF;
    
    RETURN QUERY
    EXECUTE format('
        SELECT id, title, status, floq_id, created_at
        FROM public.floq_plans
        WHERE ($1 IS NULL OR floq_id = $1)
        ORDER BY created_at DESC
        LIMIT $2
    ') USING p_floq_id, p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_floq_plans_basic TO authenticated;

-- =====================================================================================
-- FINAL STATUS REPORT
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE '=== FLOQ-PLAN INTEGRATION MIGRATION COMPLETED ===';
    RAISE NOTICE 'This was a SAFE migration that only created:';
    RAISE NOTICE '1. Indexes (if columns exist)';
    RAISE NOTICE '2. Basic constraint (if columns exist)'; 
    RAISE NOTICE '3. Simple utility function';
    RAISE NOTICE ''; 
    RAISE NOTICE 'Full integration features require schema verification.';
    RAISE NOTICE 'Check your floq_plans table structure and update accordingly.';
END $$;