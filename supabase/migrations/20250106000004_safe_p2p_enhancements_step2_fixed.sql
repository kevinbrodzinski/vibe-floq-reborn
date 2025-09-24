-- ============================================================================
-- Safe P2P Enhancement Migration - Step 2 FIXED: Functions and Policies
-- This migration safely handles existing functions and adds new ones
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SAFELY DROP AND RECREATE EXISTING FUNCTIONS
-- ============================================================================

-- Drop existing toggle_dm_reaction function if it exists (safe approach)
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.toggle_dm_reaction(uuid, uuid, text);
EXCEPTION
    WHEN undefined_function THEN NULL;
END
$$;

-- Create enhanced toggle DM reaction function
CREATE OR REPLACE FUNCTION public.toggle_dm_reaction(
    p_message_id uuid,
    p_profile_id uuid,
    p_emoji text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_reaction dm_message_reactions%ROWTYPE;
    result jsonb;
BEGIN
    -- Check if reaction exists
    SELECT * INTO existing_reaction
    FROM dm_message_reactions
    WHERE message_id = p_message_id 
    AND profile_id = p_profile_id 
    AND emoji = p_emoji;

    IF existing_reaction.message_id IS NOT NULL THEN
        -- Remove existing reaction
        DELETE FROM dm_message_reactions
        WHERE message_id = p_message_id 
        AND profile_id = p_profile_id 
        AND emoji = p_emoji;
        
        result := jsonb_build_object(
            'action', 'removed',
            'message_id', p_message_id,
            'emoji', p_emoji
        );
    ELSE
        -- Add new reaction
        INSERT INTO dm_message_reactions (message_id, profile_id, emoji)
        VALUES (p_message_id, p_profile_id, p_emoji);
        
        result := jsonb_build_object(
            'action', 'added',
            'message_id', p_message_id,
            'emoji', p_emoji
        );
    END IF;

    RETURN result;
END;
$$;

-- ============================================================================
-- 2. ENHANCED THREAD MANAGEMENT FUNCTIONS
-- ============================================================================

-- Create or get existing thread with canonical ordering
CREATE OR REPLACE FUNCTION public.create_or_get_thread(
    p_user_a uuid,
    p_user_b uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    thread_id uuid;
    user_low uuid;
    user_high uuid;
BEGIN
    -- Ensure canonical ordering
    IF p_user_a < p_user_b THEN
        user_low := p_user_a;
        user_high := p_user_b;
    ELSE
        user_low := p_user_b;
        user_high := p_user_a;
    END IF;

    -- Try to find existing thread
    SELECT id INTO thread_id
    FROM direct_threads
    WHERE (member_a = user_low AND member_b = user_high)
       OR (member_a_profile_id = user_low AND member_b_profile_id = user_high);

    -- Create new thread if none exists
    IF thread_id IS NULL THEN
        INSERT INTO direct_threads (
            member_a, 
            member_b, 
            member_a_profile_id, 
            member_b_profile_id
        )
        VALUES (user_low, user_high, user_low, user_high)
        RETURNING id INTO thread_id;
    END IF;

    RETURN thread_id;
END;
$$;

-- Enhanced thread read marking with unread count management
CREATE OR REPLACE FUNCTION public.mark_thread_read_enhanced(
    p_thread_id uuid,
    p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    thread_record direct_threads%ROWTYPE;
BEGIN
    -- Get thread details
    SELECT * INTO thread_record
    FROM direct_threads
    WHERE id = p_thread_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Thread not found';
    END IF;

    -- Update read timestamp and reset unread count based on which member
    IF thread_record.member_a_profile_id = p_profile_id THEN
        UPDATE direct_threads
        SET last_read_at_a = NOW(),
            unread_a = 0
        WHERE id = p_thread_id;
    ELSIF thread_record.member_b_profile_id = p_profile_id THEN
        UPDATE direct_threads
        SET last_read_at_b = NOW(),
            unread_b = 0
        WHERE id = p_thread_id;
    ELSE
        RAISE EXCEPTION 'User is not a member of this thread';
    END IF;
END;
$$;

-- Enhanced thread search with content and profile matching
CREATE OR REPLACE FUNCTION public.search_direct_threads_enhanced(
    p_profile_id uuid,
    p_query text DEFAULT NULL,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    thread_id uuid,
    other_profile_id uuid,
    other_display_name text,
    other_username text,
    other_avatar_url text,
    last_message_content text,
    last_message_at timestamp with time zone,
    unread_count integer,
    is_online boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.id as thread_id,
        CASE 
            WHEN dt.member_a_profile_id = p_profile_id THEN dt.member_b_profile_id
            ELSE dt.member_a_profile_id
        END as other_profile_id,
        p.display_name as other_display_name,
        p.username as other_username,
        p.avatar_url as other_avatar_url,
        dm.content as last_message_content,
        dt.last_message_at,
        CASE 
            WHEN dt.member_a_profile_id = p_profile_id THEN dt.unread_a
            ELSE dt.unread_b
        END as unread_count,
        (pr.profile_id IS NOT NULL) as is_online
    FROM direct_threads dt
    JOIN profiles p ON p.id = CASE 
        WHEN dt.member_a_profile_id = p_profile_id THEN dt.member_b_profile_id
        ELSE dt.member_a_profile_id
    END
    LEFT JOIN direct_messages dm ON dm.thread_id = dt.id 
        AND dm.created_at = dt.last_message_at
    LEFT JOIN presence pr ON pr.profile_id = p.id
    WHERE (dt.member_a_profile_id = p_profile_id OR dt.member_b_profile_id = p_profile_id)
    AND (
        p_query IS NULL OR
        p.display_name ILIKE '%' || p_query || '%' OR
        p.username ILIKE '%' || p_query || '%' OR
        dm.content ILIKE '%' || p_query || '%'
    )
    ORDER BY dt.last_message_at DESC NULLS LAST
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- 3. SAFELY HANDLE EXISTING FRIENDSHIP FUNCTIONS
-- ============================================================================

-- Drop and recreate send_friend_request_with_rate_limit if it exists
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.send_friend_request_with_rate_limit(uuid, uuid);
EXCEPTION
    WHEN undefined_function THEN NULL;
END
$$;

-- Send friend request with rate limiting
CREATE OR REPLACE FUNCTION public.send_friend_request_with_rate_limit(
    p_from_profile uuid,
    p_to_profile uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_requests_count integer;
    existing_friendship_count integer;
    existing_request_count integer;
BEGIN
    -- Rate limiting: max 10 requests per hour
    SELECT COUNT(*) INTO recent_requests_count
    FROM friend_requests
    WHERE profile_id = p_from_profile
    AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_requests_count >= 10 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'rate_limit',
            'message', 'Too many friend requests sent recently. Please wait before sending more.'
        );
    END IF;

    -- Check if already friends
    SELECT COUNT(*) INTO existing_friendship_count
    FROM friendships
    WHERE ((user_low = LEAST(p_from_profile, p_to_profile) AND user_high = GREATEST(p_from_profile, p_to_profile))
    AND friend_state = 'accepted');

    IF existing_friendship_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'already_friends',
            'message', 'You are already friends with this user.'
        );
    END IF;

    -- Check if request already exists
    SELECT COUNT(*) INTO existing_request_count
    FROM friend_requests
    WHERE ((profile_id = p_from_profile AND other_profile_id = p_to_profile)
       OR (profile_id = p_to_profile AND other_profile_id = p_from_profile))
    AND status = 'pending';

    IF existing_request_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'request_exists',
            'message', 'A friend request already exists between you and this user.'
        );
    END IF;

    -- Send the request
    INSERT INTO friend_requests (profile_id, other_profile_id, status)
    VALUES (p_from_profile, p_to_profile, 'pending');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Friend request sent successfully.'
    );
END;
$$;

-- Drop and recreate accept_friend_request_atomic if it exists
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.accept_friend_request_atomic(uuid, uuid);
EXCEPTION
    WHEN undefined_function THEN NULL;
END
$$;

-- Accept friend request atomically
CREATE OR REPLACE FUNCTION public.accept_friend_request_atomic(
    p_requester_id uuid,
    p_accepter_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_low uuid;
    user_high uuid;
    request_exists boolean := false;
BEGIN
    -- Check if request exists and is pending
    SELECT EXISTS(
        SELECT 1 FROM friend_requests
        WHERE profile_id = p_requester_id 
        AND other_profile_id = p_accepter_id 
        AND status = 'pending'
    ) INTO request_exists;

    IF NOT request_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'no_request',
            'message', 'No pending friend request found.'
        );
    END IF;

    -- Determine canonical ordering
    IF p_requester_id < p_accepter_id THEN
        user_low := p_requester_id;
        user_high := p_accepter_id;
    ELSE
        user_low := p_accepter_id;
        user_high := p_requester_id;
    END IF;

    -- Update friend request status
    UPDATE friend_requests
    SET status = 'accepted', responded_at = NOW()
    WHERE profile_id = p_requester_id 
    AND other_profile_id = p_accepter_id;

    -- Insert into friendships with canonical ordering
    INSERT INTO friendships (user_low, user_high, friend_state, responded_at)
    VALUES (user_low, user_high, 'accepted', NOW())
    ON CONFLICT (user_low, user_high) DO UPDATE SET
        friend_state = 'accepted',
        responded_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Friend request accepted successfully.'
    );
END;
$$;

-- ============================================================================
-- 4. PERFORMANCE ANALYSIS FUNCTION
-- ============================================================================

-- Analyze DM system performance
CREATE OR REPLACE FUNCTION public.analyze_dm_performance()
RETURNS TABLE (
    metric_name text,
    metric_value bigint,
    description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_threads'::text, COUNT(*)::bigint, 'Total number of direct message threads'::text
    FROM direct_threads
    
    UNION ALL
    
    SELECT 'total_messages'::text, COUNT(*)::bigint, 'Total number of direct messages'::text
    FROM direct_messages
    
    UNION ALL
    
    SELECT 'total_reactions'::text, COUNT(*)::bigint, 'Total number of message reactions'::text
    FROM dm_message_reactions
    
    UNION ALL
    
    SELECT 'active_threads_24h'::text, COUNT(DISTINCT thread_id)::bigint, 'Threads with activity in last 24 hours'::text
    FROM direct_messages
    WHERE created_at > NOW() - INTERVAL '24 hours'
    
    UNION ALL
    
    SELECT 'messages_24h'::text, COUNT(*)::bigint, 'Messages sent in last 24 hours'::text
    FROM direct_messages
    WHERE created_at > NOW() - INTERVAL '24 hours'
    
    UNION ALL
    
    SELECT 'avg_thread_messages'::text, (COUNT(*) / NULLIF(COUNT(DISTINCT thread_id), 0))::bigint, 'Average messages per thread'::text
    FROM direct_messages;
END;
$$;

-- ============================================================================
-- 5. RLS POLICIES FOR MESSAGE REACTIONS
-- ============================================================================

-- Drop existing policies if they exist (safe approach)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view reactions on accessible messages" ON dm_message_reactions;
    DROP POLICY IF EXISTS "Users can add reactions to accessible messages" ON dm_message_reactions;
    DROP POLICY IF EXISTS "Users can remove their own reactions" ON dm_message_reactions;
    DROP POLICY IF EXISTS "dm_reactions_view" ON dm_message_reactions;
    DROP POLICY IF EXISTS "dm_reactions_insert" ON dm_message_reactions;
    DROP POLICY IF EXISTS "dm_reactions_delete" ON dm_message_reactions;
EXCEPTION
    WHEN undefined_object THEN NULL;
END
$$;

-- Create comprehensive RLS policies for DM reactions
CREATE POLICY "dm_reactions_view" ON dm_message_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM direct_messages dm
            JOIN direct_threads dt ON dt.id = dm.thread_id
            WHERE dm.id = dm_message_reactions.message_id
            AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
        )
    );

CREATE POLICY "dm_reactions_insert" ON dm_message_reactions
    FOR INSERT
    WITH CHECK (
        profile_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM direct_messages dm
            JOIN direct_threads dt ON dt.id = dm.thread_id
            WHERE dm.id = dm_message_reactions.message_id
            AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
        )
    );

CREATE POLICY "dm_reactions_delete" ON dm_message_reactions
    FOR DELETE
    USING (profile_id = auth.uid());

-- ============================================================================
-- 6. RLS POLICIES FOR DM MEDIA
-- ============================================================================

-- Drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view media in their threads" ON dm_media;
    DROP POLICY IF EXISTS "Users can upload media to their threads" ON dm_media;
    DROP POLICY IF EXISTS "Users can delete their own media" ON dm_media;
    DROP POLICY IF EXISTS "dm_media_view" ON dm_media;
    DROP POLICY IF EXISTS "dm_media_insert" ON dm_media;
    DROP POLICY IF EXISTS "dm_media_delete" ON dm_media;
EXCEPTION
    WHEN undefined_object THEN NULL;
END
$$;

-- Create RLS policies for DM media
CREATE POLICY "dm_media_view" ON dm_media
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM direct_threads dt
            WHERE dt.id = dm_media.thread_id
            AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
        )
    );

CREATE POLICY "dm_media_insert" ON dm_media
    FOR INSERT
    WITH CHECK (
        uploader_profile_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM direct_threads dt
            WHERE dt.id = dm_media.thread_id
            AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
        )
    );

CREATE POLICY "dm_media_delete" ON dm_media
    FOR DELETE
    USING (uploader_profile_id = auth.uid());

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.toggle_dm_reaction(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_get_thread(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_thread_read_enhanced(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_direct_threads_enhanced(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_with_rate_limit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_dm_performance() TO authenticated;

COMMIT;

-- ============================================================================
-- Migration Step 2 FIXED Complete - Summary
-- ============================================================================

SELECT
    'P2P Enhancement Step 2 FIXED Complete!' as status,
    NOW() as completed_at,
    'Safely dropped and recreated functions with enhanced RLS policies' as description;