-- ============================================================================
-- Floq P2P Systems Enhancement Migration - Optimized for Current Database
-- Builds upon existing indexes and adds only necessary enhancements
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VIEWS FOR EFFICIENT DATA AGGREGATION
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

-- ============================================================================
-- 2. ATOMIC FUNCTIONS FOR RACE CONDITION PREVENTION
-- ============================================================================

-- Function: Toggle DM reaction atomically
CREATE OR REPLACE FUNCTION public.toggle_dm_reaction(
  p_message_id UUID,
  p_user_id UUID,
  p_emoji TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _existing_reaction_id UUID;
  _result JSON;
BEGIN
  -- Check if user can access this message (via thread membership)
  IF NOT EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = p_message_id
    AND (dt.member_a = p_user_id OR dt.member_b = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Message not accessible to user';
  END IF;

  -- Check if reaction already exists
  SELECT id INTO _existing_reaction_id
  FROM public.dm_message_reactions
  WHERE message_id = p_message_id
    AND profile_id = p_user_id
    AND emoji = p_emoji;

  IF _existing_reaction_id IS NOT NULL THEN
    -- Remove existing reaction
    DELETE FROM public.dm_message_reactions
    WHERE id = _existing_reaction_id;
    
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
$$;

-- Function: Accept friend request atomically
CREATE OR REPLACE FUNCTION public.accept_friend_request_atomic(_from_user UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_user UUID;
  _friend_request_id UUID;
  _user_low UUID;
  _user_high UUID;
  _result JSON;
BEGIN
  _current_user := auth.uid();
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update friend request atomically
  UPDATE public.friend_requests
  SET
    status = 'accepted',
    responded_at = NOW()
  WHERE
    profile_id = _from_user
    AND other_profile_id = _current_user
    AND status = 'pending'
  RETURNING id INTO _friend_request_id;

  IF _friend_request_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Create friendship with canonical ordering
  _user_low := LEAST(_current_user, _from_user);
  _user_high := GREATEST(_current_user, _from_user);

  INSERT INTO public.friendships (user_low, user_high, friend_state, responded_at)
  VALUES (_user_low, _user_high, 'accepted', NOW())
  ON CONFLICT (user_low, user_high)
  DO UPDATE SET
    friend_state = 'accepted',
    responded_at = NOW();

  -- Clean up duplicate requests
  DELETE FROM public.friend_requests
  WHERE
    ((profile_id = _current_user AND other_profile_id = _from_user) OR
     (profile_id = _from_user AND other_profile_id = _current_user))
    AND status = 'pending'
    AND id != _friend_request_id;

  _result := JSON_BUILD_OBJECT(
    'success', true,
    'friendship_created', true,
    'user_low', _user_low,
    'user_high', _user_high
  );

  RETURN _result;
END;
$$;

-- Function: Send friend request with rate limiting
CREATE OR REPLACE FUNCTION public.send_friend_request_with_rate_limit(_target_user UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_user UUID;
  _recent_requests INT;
  _request_id UUID;
  _result JSON;
BEGIN
  _current_user := auth.uid();
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Rate limiting check (10 requests per hour)
  SELECT COUNT(*) INTO _recent_requests
  FROM public.friend_requests
  WHERE
    profile_id = _current_user
    AND created_at > NOW() - INTERVAL '1 hour';

  IF _recent_requests >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 10 friend requests per hour.';
  END IF;

  -- Check for existing friendship or requests
  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_low = LEAST(_current_user, _target_user)
      AND user_high = GREATEST(_current_user, _target_user)
  ) THEN
    RAISE EXCEPTION 'Friendship already exists or blocked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE profile_id = _current_user
      AND other_profile_id = _target_user
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Friend request already sent';
  END IF;

  -- Create the request
  INSERT INTO public.friend_requests (profile_id, other_profile_id, status)
  VALUES (_current_user, _target_user, 'pending')
  RETURNING id INTO _request_id;

  _result := JSON_BUILD_OBJECT(
    'success', true,
    'request_id', _request_id
  );

  RETURN _result;
END;
$$;

-- Function: Enhanced thread search
CREATE OR REPLACE FUNCTION public.search_direct_threads(q TEXT)
RETURNS TABLE(
  thread_id UUID,
  friend_profile_id UUID,
  friend_display_name TEXT,
  friend_username TEXT,
  friend_avatar_url TEXT,
  last_message_at TIMESTAMPTZ,
  my_unread_count INTEGER,
  last_message_content TEXT,
  match_type TEXT,
  match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_user UUID;
  _query TEXT;
BEGIN
  _current_user := auth.uid();
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF q IS NULL OR LENGTH(TRIM(q)) < 2 THEN
    RETURN;
  END IF;

  _query := LOWER(TRIM(q));

  RETURN QUERY
  WITH user_threads AS (
    SELECT
      dt.id as thread_id,
      CASE
        WHEN dt.member_a = _current_user THEN dt.member_b_profile_id
        ELSE dt.member_a_profile_id
      END as friend_profile_id,
      CASE
        WHEN dt.member_a = _current_user THEN dt.unread_a
        ELSE dt.unread_b
      END as my_unread_count,
      dt.last_message_at
    FROM public.direct_threads dt
    WHERE dt.member_a = _current_user OR dt.member_b = _current_user
  ),
  threads_with_profiles AS (
    SELECT
      ut.*,
      p.display_name,
      p.username,
      p.avatar_url
    FROM user_threads ut
    JOIN public.profiles p ON p.id = ut.friend_profile_id
  ),
  recent_messages AS (
    SELECT DISTINCT ON (dm.thread_id)
      dm.thread_id,
      dm.content
    FROM public.direct_messages dm
    JOIN user_threads ut ON ut.thread_id = dm.thread_id
    WHERE dm.content IS NOT NULL
      AND LOWER(dm.content) LIKE '%' || _query || '%'
      AND dm.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY dm.thread_id, dm.created_at DESC
  )
  SELECT
    twp.thread_id,
    twp.friend_profile_id,
    COALESCE(twp.display_name, '') as friend_display_name,
    COALESCE(twp.username, '') as friend_username,
    COALESCE(twp.avatar_url, '') as friend_avatar_url,
    twp.last_message_at,
    twp.my_unread_count,
    rm.content as last_message_content,
    CASE
      WHEN rm.content IS NOT NULL THEN 'message'
      WHEN LOWER(twp.username) LIKE '%' || _query || '%' THEN 'username'
      ELSE 'name'
    END as match_type,
    GREATEST(
      CASE
        WHEN LOWER(twp.display_name) LIKE _query || '%' THEN 90
        WHEN LOWER(twp.display_name) LIKE '%' || _query || '%' THEN 70
        ELSE 0
      END,
      CASE
        WHEN LOWER(twp.username) LIKE _query || '%' THEN 85
        WHEN LOWER(twp.username) LIKE '%' || _query || '%' THEN 65
        ELSE 0
      END,
      CASE
        WHEN rm.content IS NOT NULL AND LOWER(rm.content) LIKE _query || '%' THEN 80
        WHEN rm.content IS NOT NULL THEN 60
        ELSE 0
      END
    ) as match_score
  FROM threads_with_profiles twp
  LEFT JOIN recent_messages rm ON rm.thread_id = twp.thread_id
  WHERE
    LOWER(twp.display_name) LIKE '%' || _query || '%'
    OR LOWER(twp.username) LIKE '%' || _query || '%'
    OR rm.content IS NOT NULL
  ORDER BY match_score DESC, twp.last_message_at DESC
  LIMIT 15;
END;
$$;

-- Function: Mark thread as read
CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_user UUID;
  _updated_rows INTEGER;
  _result JSON;
BEGIN
  _current_user := auth.uid();
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update the appropriate member's read timestamp and reset unread count
  UPDATE public.direct_threads
  SET
    last_read_at_a = CASE WHEN member_a = _current_user THEN NOW() ELSE last_read_at_a END,
    last_read_at_b = CASE WHEN member_b = _current_user THEN NOW() ELSE last_read_at_b END,
    unread_a = CASE WHEN member_a = _current_user THEN 0 ELSE unread_a END,
    unread_b = CASE WHEN member_b = _current_user THEN 0 ELSE unread_b END
  WHERE
    id = p_thread_id
    AND (member_a = _current_user OR member_b = _current_user);

  GET DIAGNOSTICS _updated_rows = ROW_COUNT;

  IF _updated_rows = 0 THEN
    RAISE EXCEPTION 'Thread not found or access denied';
  END IF;

  _result := JSON_BUILD_OBJECT(
    'success', true,
    'thread_id', p_thread_id,
    'marked_read_at', NOW()
  );

  RETURN _result;
END;
$$;

-- ============================================================================
-- 3. OPTIMIZED INDEXES (Only adding what's missing)
-- ============================================================================

-- Additional reaction indexes for performance (your current ones are good)
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

-- Message content search (only if not exists)
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

-- Thread activity optimization
CREATE INDEX IF NOT EXISTS idx_threads_recent_activity
ON public.direct_threads (last_message_at DESC)
WHERE last_message_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Ensure RLS is enabled (may already be enabled)
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dm_message_reactions
DROP POLICY IF EXISTS "Users can view reactions on accessible messages" ON public.dm_message_reactions;
CREATE POLICY "Users can view reactions on accessible messages"
ON public.dm_message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = dm_message_reactions.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can add reactions to accessible messages" ON public.dm_message_reactions;
CREATE POLICY "Users can add reactions to accessible messages"
ON public.dm_message_reactions FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = dm_message_reactions.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.dm_message_reactions;
CREATE POLICY "Users can remove their own reactions"
ON public.dm_message_reactions FOR DELETE
USING (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = dm_message_reactions.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- RLS Policies for dm_media
DROP POLICY IF EXISTS "Users can view media in accessible threads" ON public.dm_media;
CREATE POLICY "Users can view media in accessible threads"
ON public.dm_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_threads dt
    WHERE dt.id = dm_media.thread_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can upload media to accessible threads" ON public.dm_media;
CREATE POLICY "Users can upload media to accessible threads"
ON public.dm_media FOR INSERT
WITH CHECK (
  uploader_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.direct_threads dt
    WHERE dt.id = dm_media.thread_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- ============================================================================
-- 5. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.toggle_dm_reaction(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_with_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_direct_threads(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(UUID) TO authenticated;

-- Grant access to views
GRANT SELECT ON public.v_dm_message_reactions_summary TO authenticated;

-- ============================================================================
-- 6. DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW public.v_dm_message_reactions_summary IS
'Aggregated view of DM message reactions with profile details for efficient frontend consumption';

COMMENT ON FUNCTION public.toggle_dm_reaction(UUID, UUID, TEXT) IS
'Toggle a reaction on a DM message with access control and atomic operation';

COMMENT ON FUNCTION public.accept_friend_request_atomic(UUID) IS
'Atomically accept a friend request, preventing race conditions';

COMMENT ON FUNCTION public.send_friend_request_with_rate_limit(UUID) IS
'Send friend request with rate limiting (10 per hour) and duplicate prevention';

COMMENT ON FUNCTION public.search_direct_threads(TEXT) IS
'Search direct message threads by participant name, username, or message content with scoring';

COMMENT ON FUNCTION public.mark_thread_read(UUID) IS
'Mark a direct message thread as read and reset unread count';

COMMIT;

-- ============================================================================
-- Migration Complete - Optimized for Current Database State
-- ============================================================================

SELECT
  'Floq P2P Systems Enhancement Complete!' as status,
  NOW() as completed_at,
  'Optimized migration applied successfully' as description;