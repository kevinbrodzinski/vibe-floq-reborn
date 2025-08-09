-- Fix data type mismatch in search_direct_threads_enhanced function
-- The profiles.username column is citext, not text

-- Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS public.search_direct_threads_enhanced(uuid, text, integer);

-- Enhanced thread search with content and profile matching (fixed types)
CREATE OR REPLACE FUNCTION public.search_direct_threads_enhanced(
    p_profile_id uuid,
    p_query text DEFAULT NULL,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    thread_id uuid,
    other_profile_id uuid,
    other_display_name text,
    other_username citext,  -- Changed from text to citext
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