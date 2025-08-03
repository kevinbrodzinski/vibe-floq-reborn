-- Rate Limiting System for Friend Requests
-- Prevents spam and abuse by limiting the number of friend requests per user per time window

-- 1. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.user_action_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one record per user per action type
  UNIQUE(user_id, action_type)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_limits_user_action 
ON public.user_action_limits(user_id, action_type);

CREATE INDEX IF NOT EXISTS idx_user_action_limits_window_start 
ON public.user_action_limits(window_start);

-- 3. Enable RLS
ALTER TABLE public.user_action_limits ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view their own action limits"
ON public.user_action_limits FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage action limits"
ON public.user_action_limits FOR ALL
USING (true); -- Functions will handle the security

-- 5. Create rate limiting configuration table
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  action_type TEXT PRIMARY KEY,
  max_count INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Insert default rate limit configurations
INSERT INTO public.rate_limit_config (action_type, max_count, window_minutes, description) VALUES
('friend_request', 10, 60, 'Maximum 10 friend requests per hour'),
('friend_request_to_same_user', 1, 1440, 'Maximum 1 friend request to same user per day'),
('message_send', 100, 60, 'Maximum 100 messages per hour')
ON CONFLICT (action_type) DO UPDATE SET
  max_count = EXCLUDED.max_count,
  window_minutes = EXCLUDED.window_minutes,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 7. Create rate limiting check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_target_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record RECORD;
  limit_record RECORD;
  window_start_time TIMESTAMPTZ;
  current_count INTEGER := 0;
  is_allowed BOOLEAN := true;
  reset_time TIMESTAMPTZ;
  result JSON;
  composite_action_type TEXT;
BEGIN
  -- Create composite action type for user-specific limits
  composite_action_type := CASE 
    WHEN p_target_user_id IS NOT NULL THEN p_action_type || '_to_user_' || p_target_user_id::text
    ELSE p_action_type
  END;

  -- Get rate limit configuration
  SELECT max_count, window_minutes 
  INTO config_record
  FROM rate_limit_config 
  WHERE action_type = p_action_type;
  
  IF NOT FOUND THEN
    -- No rate limit configured, allow action
    RETURN json_build_object(
      'allowed', true,
      'reason', 'no_limit_configured'
    );
  END IF;

  -- Calculate window start time
  window_start_time := NOW() - (config_record.window_minutes || ' minutes')::INTERVAL;

  -- Get or create user action limit record
  SELECT count, window_start
  INTO limit_record
  FROM user_action_limits
  WHERE user_id = p_user_id AND action_type = composite_action_type;

  IF FOUND THEN
    -- Check if we need to reset the window
    IF limit_record.window_start < window_start_time THEN
      -- Reset the counter for new window
      UPDATE user_action_limits 
      SET 
        count = 0,
        window_start = NOW(),
        updated_at = NOW()
      WHERE user_id = p_user_id AND action_type = composite_action_type;
      current_count := 0;
    ELSE
      current_count := limit_record.count;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO user_action_limits (user_id, action_type, count, window_start)
    VALUES (p_user_id, composite_action_type, 0, NOW());
    current_count := 0;
  END IF;

  -- Check if limit is exceeded
  IF current_count >= config_record.max_count THEN
    is_allowed := false;
    reset_time := (SELECT window_start + (config_record.window_minutes || ' minutes')::INTERVAL 
                   FROM user_action_limits 
                   WHERE user_id = p_user_id AND action_type = composite_action_type);
  ELSE
    reset_time := NULL;
  END IF;

  -- Build result
  result := json_build_object(
    'allowed', is_allowed,
    'current_count', current_count,
    'max_count', config_record.max_count,
    'window_minutes', config_record.window_minutes,
    'reset_time', reset_time,
    'reason', CASE 
      WHEN is_allowed THEN 'within_limit'
      ELSE 'rate_limit_exceeded'
    END
  );

  RETURN result;
END;
$$;

-- 8. Create function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_target_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  composite_action_type TEXT;
  result JSON;
BEGIN
  -- Create composite action type for user-specific limits
  composite_action_type := CASE 
    WHEN p_target_user_id IS NOT NULL THEN p_action_type || '_to_user_' || p_target_user_id::text
    ELSE p_action_type
  END;

  -- Increment the counter
  INSERT INTO user_action_limits (user_id, action_type, count, window_start)
  VALUES (p_user_id, composite_action_type, 1, NOW())
  ON CONFLICT (user_id, action_type) 
  DO UPDATE SET 
    count = user_action_limits.count + 1,
    updated_at = NOW();

  result := json_build_object(
    'success', true,
    'action_type', composite_action_type,
    'incremented', true
  );

  RETURN result;
END;
$$;

-- 9. Create enhanced friend request function with rate limiting
CREATE OR REPLACE FUNCTION public.send_friend_request_with_rate_limit(
  p_target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  rate_check JSON;
  result JSON;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_user_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;

  -- Check general friend request rate limit
  SELECT check_rate_limit(current_user_id, 'friend_request') INTO rate_check;
  
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'message', 'Too many friend requests sent recently',
      'rate_limit_info', rate_check
    );
  END IF;

  -- Check user-specific rate limit
  SELECT check_rate_limit(current_user_id, 'friend_request_to_same_user', p_target_user_id) INTO rate_check;
  
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'user_rate_limit_exceeded',
      'message', 'Friend request already sent to this user recently',
      'rate_limit_info', rate_check
    );
  END IF;

  -- Check if friend request already exists
  IF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE profile_id = current_user_id 
      AND other_profile_id = p_target_user_id 
      AND status = 'pending'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'duplicate_request',
      'message', 'Friend request already exists'
    );
  END IF;

  -- Send the friend request
  INSERT INTO friend_requests (profile_id, other_profile_id, status)
  VALUES (current_user_id, p_target_user_id, 'pending');

  -- Increment rate limit counters
  PERFORM increment_rate_limit(current_user_id, 'friend_request');
  PERFORM increment_rate_limit(current_user_id, 'friend_request_to_same_user', p_target_user_id);

  result := json_build_object(
    'success', true,
    'message', 'Friend request sent successfully'
  );

  RETURN result;
END;
$$;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_with_rate_limit(UUID) TO authenticated;

-- 11. Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rate limit records older than 7 days
  DELETE FROM user_action_limits 
  WHERE window_start < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 12. Add comments for documentation
COMMENT ON TABLE public.user_action_limits IS 'Tracks user action counts for rate limiting';
COMMENT ON TABLE public.rate_limit_config IS 'Configuration for different types of rate limits';
COMMENT ON FUNCTION public.check_rate_limit(UUID, TEXT, UUID) IS 'Checks if a user action is within rate limits';
COMMENT ON FUNCTION public.increment_rate_limit(UUID, TEXT, UUID) IS 'Increments the rate limit counter for a user action';
COMMENT ON FUNCTION public.send_friend_request_with_rate_limit(UUID) IS 'Sends a friend request with rate limiting checks';
COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS 'Cleans up old rate limit records to prevent table bloat';