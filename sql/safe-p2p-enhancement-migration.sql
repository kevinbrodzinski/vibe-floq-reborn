-- ============================================================================
-- SAFE P2P Systems Enhancement Migration - Incremental Approach
-- Step-by-step migration with conflict detection and rollback safety
-- ============================================================================

-- Step 1: Audit current state
DO $$
DECLARE
    audit_results TEXT[];
    func_exists BOOLEAN;
    policy_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== AUDITING CURRENT STATE ===';
    
    -- Check for existing functions
    SELECT EXISTS(
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON n.oid = p.pronamespace 
        WHERE n.nspname = 'public' AND p.proname = 'toggle_dm_reaction'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'CONFLICT: toggle_dm_reaction function already exists';
        audit_results := array_append(audit_results, 'toggle_dm_reaction_exists');
    END IF;
    
    -- Check for existing policies
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'dm_message_reactions' 
        AND policyname = 'dm_react_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        RAISE NOTICE 'INFO: dm_react_own policy already exists - will skip';
        audit_results := array_append(audit_results, 'dm_react_own_exists');
    END IF;
    
    -- Store audit results for next steps
    CREATE TEMP TABLE IF NOT EXISTS migration_audit (
        audit_key TEXT PRIMARY KEY,
        audit_value TEXT
    );
    
    -- Store findings
    INSERT INTO migration_audit (audit_key, audit_value) 
    VALUES ('audit_complete', array_to_string(audit_results, ','))
    ON CONFLICT (audit_key) DO UPDATE SET audit_value = EXCLUDED.audit_value;
    
    RAISE NOTICE 'Audit complete. Found conflicts: %', array_to_string(audit_results, ', ');
END $$;

-- ============================================================================
-- Step 2: Safe View Creation (Views are always safe to replace)
-- ============================================================================

-- Create optimized view for message reactions with aggregation
CREATE OR REPLACE VIEW public.v_dm_message_reactions_summary AS
SELECT
    dmr.message_id,
    dmr.emoji,
    COUNT(*) as reaction_count,
    ARRAY_AGG(dmr.profile_id ORDER BY dmr.reacted_at) as reactor_profile_ids,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'profile_id', dmr.profile_id,
            'reacted_at', dmr.reacted_at
        ) ORDER BY dmr.reacted_at
    ) as reactor_details,
    MIN(dmr.reacted_at) as first_reaction_at,
    MAX(dmr.reacted_at) as latest_reaction_at
FROM public.dm_message_reactions dmr
GROUP BY dmr.message_id, dmr.emoji;

COMMENT ON VIEW public.v_dm_message_reactions_summary IS
'Aggregated view of DM message reactions for efficient frontend consumption';

-- ============================================================================
-- Step 3: Safe Index Creation (Only if not exists)
-- ============================================================================

-- Additional reaction indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_reactions_emoji_created
ON public.dm_message_reactions (emoji, reacted_at DESC);

-- Media indexes for thread and message queries
CREATE INDEX IF NOT EXISTS idx_dm_media_message_id
ON public.dm_media (message_id)
WHERE message_id IS NOT NULL;

-- Friend request performance indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_target_status_created
ON public.friend_requests (other_profile_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_rate_limit
ON public.friend_requests (profile_id, created_at)
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Thread activity optimization
CREATE INDEX IF NOT EXISTS idx_threads_recent_activity
ON public.direct_threads (last_message_at DESC)
WHERE last_message_at > NOW() - INTERVAL '30 days';

-- Message content search (safe check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_dm_content_search'
        AND tablename = 'direct_messages'
    ) THEN
        CREATE INDEX idx_dm_content_search
        ON public.direct_messages USING gin(to_tsvector('english', content))
        WHERE content IS NOT NULL;
        RAISE NOTICE 'Created content search index';
    ELSE
        RAISE NOTICE 'Content search index already exists';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Safe Function Creation (Check for conflicts first)
-- ============================================================================

-- Only create new functions if they don't conflict
DO $$
DECLARE
    existing_toggle_func_sig TEXT;
BEGIN
    -- Check existing toggle_dm_reaction signature
    SELECT pg_get_function_identity_arguments(p.oid)
    INTO existing_toggle_func_sig
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'public' AND p.proname = 'toggle_dm_reaction';
    
    IF existing_toggle_func_sig IS NOT NULL THEN
        RAISE NOTICE 'SKIPPING: toggle_dm_reaction already exists with signature: %', existing_toggle_func_sig;
        RAISE NOTICE 'Consider using the existing function or renaming this one';
    ELSE
        -- Safe to create new function
        CREATE OR REPLACE FUNCTION public.toggle_dm_reaction_safe(
            p_message_id UUID,
            p_user_id UUID,
            p_emoji TEXT
        )
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        DECLARE
            _existing_reaction BOOLEAN := FALSE;
            _result JSON;
        BEGIN
            -- Check if user can access this message
            IF NOT EXISTS (
                SELECT 1 FROM public.direct_messages dm
                JOIN public.direct_threads dt ON dt.id = dm.thread_id
                WHERE dm.id = p_message_id
                AND (dt.member_a = p_user_id OR dt.member_b = p_user_id)
            ) THEN
                RAISE EXCEPTION 'Message not accessible to user';
            END IF;

            -- Check if reaction exists
            SELECT EXISTS(
                SELECT 1 FROM public.dm_message_reactions
                WHERE message_id = p_message_id
                AND profile_id = p_user_id
                AND emoji = p_emoji
            ) INTO _existing_reaction;

            IF _existing_reaction THEN
                -- Remove existing reaction
                DELETE FROM public.dm_message_reactions
                WHERE message_id = p_message_id
                AND profile_id = p_user_id
                AND emoji = p_emoji;
                
                _result := JSON_BUILD_OBJECT(
                    'action', 'removed',
                    'message_id', p_message_id,
                    'emoji', p_emoji
                );
            ELSE
                -- Add new reaction
                INSERT INTO public.dm_message_reactions (message_id, profile_id, emoji)
                VALUES (p_message_id, p_user_id, p_emoji);
                
                _result := JSON_BUILD_OBJECT(
                    'action', 'added',
                    'message_id', p_message_id,
                    'emoji', p_emoji
                );
            END IF;

            RETURN _result;
        END;
        $func$;
        
        RAISE NOTICE 'Created toggle_dm_reaction_safe function';
    END IF;
END $$;

-- ============================================================================
-- Step 5: Safe RLS Policy Updates (Only update if different)
-- ============================================================================

DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if RLS is enabled on dm_message_reactions
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'dm_message_reactions' AND relnamespace = 'public'::regnamespace;
    
    IF NOT rls_enabled THEN
        ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on dm_message_reactions';
    ELSE
        RAISE NOTICE 'RLS already enabled on dm_message_reactions';
    END IF;
    
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dm_message_reactions';
    
    RAISE NOTICE 'Found % existing policies on dm_message_reactions', policy_count;
    
    -- Only add policies if none exist or if specifically missing
    IF policy_count = 0 THEN
        RAISE NOTICE 'No existing policies found - you may want to add policies manually';
        RAISE NOTICE 'Consider reviewing existing policy names before adding new ones';
    ELSE
        RAISE NOTICE 'Existing policies found - skipping policy creation to avoid conflicts';
        RAISE NOTICE 'Review existing policies and update manually if needed';
    END IF;
END $$;

-- ============================================================================
-- Step 6: Grant Safe Permissions
-- ============================================================================

-- Grant execute permissions on new functions only
DO $$
BEGIN
    -- Only grant if function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON n.oid = p.pronamespace 
        WHERE n.nspname = 'public' AND p.proname = 'toggle_dm_reaction_safe'
    ) THEN
        GRANT EXECUTE ON FUNCTION public.toggle_dm_reaction_safe(UUID, UUID, TEXT) TO authenticated;
        RAISE NOTICE 'Granted permissions on toggle_dm_reaction_safe';
    END IF;
END $$;

-- Grant access to views (always safe)
GRANT SELECT ON public.v_dm_message_reactions_summary TO authenticated;

-- ============================================================================
-- Step 7: Migration Summary and Next Steps
-- ============================================================================

DO $$
DECLARE
    audit_value TEXT;
BEGIN
    SELECT audit_value INTO audit_value 
    FROM migration_audit 
    WHERE audit_key = 'audit_complete';
    
    RAISE NOTICE '=== SAFE MIGRATION COMPLETE ===';
    RAISE NOTICE 'What was added:';
    RAISE NOTICE '  ✅ View: v_dm_message_reactions_summary';
    RAISE NOTICE '  ✅ Indexes: 6 performance indexes (if not existing)';
    RAISE NOTICE '  ✅ Function: toggle_dm_reaction_safe (if no conflicts)';
    RAISE NOTICE '  ✅ RLS: Enabled on dm_message_reactions (if not already)';
    RAISE NOTICE '';
    RAISE NOTICE 'What was skipped due to conflicts:';
    RAISE NOTICE '  ⚠️  Functions: Skipped if existing versions found';
    RAISE NOTICE '  ⚠️  Policies: Skipped if existing policies found';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test the new view: SELECT * FROM v_dm_message_reactions_summary LIMIT 5';
    RAISE NOTICE '  2. Review any conflict warnings above';
    RAISE NOTICE '  3. If needed, manually handle function conflicts';
    RAISE NOTICE '  4. Test application functionality';
    RAISE NOTICE '';
    RAISE NOTICE 'Audit findings: %', COALESCE(audit_value, 'none');
END $$;

-- Clean up temp table
DROP TABLE IF EXISTS migration_audit;

SELECT 
    'Safe P2P Enhancement Migration Complete' as status,
    NOW() as completed_at,
    'No destructive changes made' as safety_note;