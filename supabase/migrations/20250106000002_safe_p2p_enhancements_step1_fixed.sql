-- ============================================================================
-- Safe P2P Enhancement Migration - Step 1: Non-Conflicting Additions (FIXED)
-- This migration only adds NEW components that don't conflict with existing ones
-- FIXED: Removed problematic rate limiting index with NOW() function
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SAFE VIEW ADDITIONS (Only if they don't exist)
-- ============================================================================

-- Create reaction summary view with safe naming
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'v_dm_message_reactions_summary'
    ) THEN
        CREATE VIEW public.v_dm_message_reactions_summary AS
        SELECT
            dmr.message_id,
            dmr.emoji,
            COUNT(*) as reaction_count,
            ARRAY_AGG(dmr.profile_id ORDER BY dmr.reacted_at) as reactor_profile_ids,
            ARRAY_AGG(
                JSON_BUILD_OBJECT(
                    'profile_id', dmr.profile_id,
                    'display_name', p.display_name,
                    'username', p.username,
                    'avatar_url', p.avatar_url,
                    'reacted_at', dmr.reacted_at
                ) ORDER BY dmr.reacted_at
            ) as reactor_details,
            MIN(dmr.reacted_at) as first_reaction_at,
            MAX(dmr.reacted_at) as latest_reaction_at
        FROM public.dm_message_reactions dmr
        JOIN public.profiles p ON p.id = dmr.profile_id
        GROUP BY dmr.message_id, dmr.emoji;

        COMMENT ON VIEW public.v_dm_message_reactions_summary IS
        'Aggregated view of DM message reactions with profile details for efficient frontend consumption';
    END IF;
END
$$;

-- ============================================================================
-- 2. SAFE INDEX ADDITIONS (Only add truly missing ones)
-- ============================================================================

-- Add indexes only if they don't already exist with similar patterns

-- Emoji-based reaction index (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_dm_reactions_emoji_created'
    ) THEN
        CREATE INDEX idx_dm_reactions_emoji_created
        ON public.dm_message_reactions (emoji, reacted_at DESC);
    END IF;
END
$$;

-- Media message association index (if not exists)  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_dm_media_message_id'
    ) THEN
        CREATE INDEX idx_dm_media_message_id
        ON public.dm_media (message_id)
        WHERE message_id IS NOT NULL;
    END IF;
END
$$;

-- Friend request target optimization (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_friend_requests_target_status_created'
    ) THEN
        CREATE INDEX idx_friend_requests_target_status_created
        ON public.friend_requests (other_profile_id, status, created_at DESC);
    END IF;
END
$$;

-- Simple friend requests index for rate limiting (FIXED - without NOW() function)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_friend_requests_profile_created'
    ) THEN
        CREATE INDEX idx_friend_requests_profile_created
        ON public.friend_requests (profile_id, created_at DESC);
    END IF;
END
$$;

-- Content search index (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_dm_content_search'
    ) THEN
        CREATE INDEX idx_dm_content_search
        ON public.direct_messages USING gin(to_tsvector('english', content))
        WHERE content IS NOT NULL;
    END IF;
END
$$;

-- Recent activity optimization (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_threads_recent_activity'
    ) THEN
        CREATE INDEX idx_threads_recent_activity
        ON public.direct_threads (last_message_at DESC)
        WHERE last_message_at > '2024-01-01'::timestamp with time zone;
    END IF;
END
$$;

-- ============================================================================
-- 3. SAFE PERMISSION GRANTS
-- ============================================================================

-- Grant access to the new view
GRANT SELECT ON public.v_dm_message_reactions_summary TO authenticated;

-- ============================================================================
-- 4. ENABLE RLS (Safe - won't conflict if already enabled)
-- ============================================================================

-- Enable RLS on tables (safe if already enabled)
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_media ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- Migration Step 1 Complete - Summary
-- ============================================================================

SELECT
    'P2P Enhancement Step 1 Complete!' as status,
    NOW() as completed_at,
    'Added non-conflicting views, indexes, and permissions (FIXED VERSION)' as description;