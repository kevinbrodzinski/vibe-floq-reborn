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
  -- Get current user from auth context
  _current_user := auth.uid();
  
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF _from_user = _current_user THEN
    RAISE EXCEPTION 'Cannot accept friend request from yourself';
  END IF;

  -- Start transaction for atomicity
  BEGIN
    -- Check if friend request exists and update it atomically
    UPDATE public.friend_requests 
    SET 
      status = 'accepted',
      responded_at = NOW()
    WHERE 
      profile_id = _from_user 
      AND other_profile_id = _current_user 
      AND status = 'pending'
    RETURNING id INTO _friend_request_id;

    -- If no friend request found, raise exception
    IF _friend_request_id IS NULL THEN
      RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;

    -- Create friendship with canonical ordering (user_low < user_high)
    _user_low := LEAST(_current_user, _from_user);
    _user_high := GREATEST(_current_user, _from_user);

    -- Insert or update friendship
    INSERT INTO public.friendships (user_low, user_high, friend_state, responded_at)
    VALUES (_user_low, _user_high, 'accepted', NOW())
    ON CONFLICT (user_low, user_high) 
    DO UPDATE SET 
      friend_state = 'accepted',
      responded_at = NOW();

    -- Clean up any other pending requests between these users
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

  EXCEPTION WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to accept friend request: %', SQLERRM;
  END;
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
  _existing_request_id UUID;
  _existing_friendship UUID;
  _request_id UUID;
  _result JSON;
BEGIN
  -- Get current user from auth context
  _current_user := auth.uid();
  
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF _target_user = _current_user THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;

  -- Check rate limiting (max 10 requests per hour)
  SELECT COUNT(*) INTO _recent_requests
  FROM public.friend_requests
  WHERE 
    profile_id = _current_user 
    AND created_at > NOW() - INTERVAL '1 hour';

  IF _recent_requests >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. You can only send 10 friend requests per hour.';
  END IF;

  -- Check if friendship already exists
  SELECT user_low INTO _existing_friendship
  FROM public.friendships
  WHERE 
    user_low = LEAST(_current_user, _target_user)
    AND user_high = GREATEST(_current_user, _target_user)
    AND friend_state IN ('accepted', 'blocked');

  IF _existing_friendship IS NOT NULL THEN
    RAISE EXCEPTION 'Friendship already exists or user is blocked';
  END IF;

  -- Check if request already exists
  SELECT id INTO _existing_request_id
  FROM public.friend_requests
  WHERE 
    profile_id = _current_user 
    AND other_profile_id = _target_user 
    AND status = 'pending';

  IF _existing_request_id IS NOT NULL THEN
    RAISE EXCEPTION 'Friend request already sent';
  END IF;

  -- Check if there's an incoming request from target user
  SELECT id INTO _existing_request_id
  FROM public.friend_requests
  WHERE 
    profile_id = _target_user 
    AND other_profile_id = _current_user 
    AND status = 'pending';

  IF _existing_request_id IS NOT NULL THEN
    RAISE EXCEPTION 'This user has already sent you a friend request. Please accept their request instead.';
  END IF;

  -- Create the friend request
  INSERT INTO public.friend_requests (profile_id, other_profile_id, status)
  VALUES (_current_user, _target_user, 'pending')
  RETURNING id INTO _request_id;

  _result := JSON_BUILD_OBJECT(
    'success', true,
    'request_id', _request_id,
    'target_user', _target_user
  );

  RETURN _result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to send friend request: %', SQLERRM;
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
  -- Get current user from auth context
  _current_user := auth.uid();
  
  IF _current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF q IS NULL OR LENGTH(TRIM(q)) < 2 THEN
    RETURN;
  END IF;

  _query := LOWER(TRIM(q));

  RETURN QUERY
  WITH thread_data AS (
    SELECT 
      dt.id as thread_id,
      CASE 
        WHEN dt.member_a = _current_user THEN dt.member_b_profile_id
        ELSE dt.member_a_profile_id
      END as friend_profile_id,
      CASE 
        WHEN dt.member_a = _current_user THEN dt.member_b
        ELSE dt.member_a
      END as friend_user_id,
      CASE 
        WHEN dt.member_a = _current_user THEN dt.unread_a
        ELSE dt.unread_b
      END as my_unread_count,
      dt.last_message_at
    FROM public.direct_threads dt
    WHERE dt.member_a = _current_user OR dt.member_b = _current_user
  ),
  thread_with_profiles AS (
    SELECT 
      td.*,
      p.display_name,
      p.username,
      p.avatar_url
    FROM thread_data td
    JOIN public.profiles p ON p.id = td.friend_profile_id
  ),
  message_matches AS (
    SELECT 
      dm.thread_id,
      dm.content,
      CASE 
        WHEN LOWER(dm.content) = _query THEN 100
        WHEN LOWER(dm.content) LIKE _query || '%' THEN 80
        WHEN LOWER(dm.content) LIKE '%' || _query || '%' THEN 60
        ELSE 0
      END as content_score
    FROM public.direct_messages dm
    JOIN thread_data td ON td.thread_id = dm.thread_id
    WHERE 
      dm.content IS NOT NULL 
      AND LOWER(dm.content) LIKE '%' || _query || '%'
      AND dm.created_at >= NOW() - INTERVAL '30 days' -- Only search recent messages
    ORDER BY dm.created_at DESC
    LIMIT 50 -- Limit for performance
  ),
  best_message_matches AS (
    SELECT 
      thread_id,
      content,
      content_score,
      ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY content_score DESC) as rn
    FROM message_matches
    WHERE content_score > 0
  )
  SELECT 
    twp.thread_id,
    twp.friend_profile_id,
    COALESCE(twp.display_name, '') as friend_display_name,
    COALESCE(twp.username, '') as friend_username,
    COALESCE(twp.avatar_url, '') as friend_avatar_url,
    twp.last_message_at,
    twp.my_unread_count,
    bmm.content as last_message_content,
    CASE 
      WHEN bmm.content_score > 0 THEN 'message'
      WHEN LOWER(twp.username) LIKE '%' || _query || '%' THEN 'username'
      ELSE 'name'
    END as match_type,
    GREATEST(
      CASE 
        WHEN LOWER(twp.display_name) = _query THEN 100
        WHEN LOWER(twp.display_name) LIKE _query || '%' THEN 80
        WHEN LOWER(twp.display_name) LIKE '%' || _query || '%' THEN 60
        ELSE 0
      END,
      CASE 
        WHEN LOWER(twp.username) = _query THEN 100
        WHEN LOWER(twp.username) LIKE _query || '%' THEN 80
        WHEN LOWER(twp.username) LIKE '%' || _query || '%' THEN 60
        ELSE 0
      END,
      COALESCE(bmm.content_score, 0)
    ) as match_score
  FROM thread_with_profiles twp
  LEFT JOIN best_message_matches bmm ON bmm.thread_id = twp.thread_id AND bmm.rn = 1
  WHERE 
    LOWER(twp.display_name) LIKE '%' || _query || '%' 
    OR LOWER(twp.username) LIKE '%' || _query || '%'
    OR bmm.content_score > 0
  ORDER BY match_score DESC, twp.last_message_at DESC
  LIMIT 15;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.accept_friend_request_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_with_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_direct_threads(TEXT) TO authenticated;