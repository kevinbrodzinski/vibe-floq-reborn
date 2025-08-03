-- Rate Limiting System for Friend Requests
-- Prevents spam and abuse by limiting the number of friend requests per user per time window

-- 1. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.user_action_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- For user-specific rate limits
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE(profile_id, action_type, target_profile_id, window_start)
);

-- 2. Create rate limit configuration table
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  max_count INTEGER NOT NULL,
  window_duration_minutes INTEGER NOT NULL,
  per_target BOOLEAN NOT NULL DEFAULT false, -- Whether limit applies per target user
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Insert default rate limit configurations
INSERT INTO public.rate_limit_config (action_type, max_count, window_duration_minutes, per_target)
VALUES 
  ('friend_request', 50, 60, false),        -- 50 friend requests per hour globally
  ('friend_request_per_user', 3, 1440, true), -- 3 requests per user per day
  ('message_send', 100, 60, false),         -- 100 messages per hour
  ('floq_create', 10, 60, false),           -- 10 floqs per hour
  ('plan_create', 20, 60, false)            -- 20 plans per hour
ON CONFLICT (action_type) DO NOTHING;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_limits_profile_id ON public.user_action_limits(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_action_type ON public.user_action_limits(action_type);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_window_start ON public.user_action_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_profile_action ON public.user_action_limits(profile_id, action_type);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_target ON public.user_action_limits(target_profile_id) WHERE target_profile_id IS NOT NULL;

-- 5. Enable RLS
ALTER TABLE public.user_action_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view their own action limits"
ON public.user_action_limits FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "System can manage action limits"
ON public.user_action_limits FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Rate limit config is readable by authenticated users"
ON public.rate_limit_config FOR SELECT
TO authenticated
USING (true);

-- 7. Create rate limiting functions

-- Function to check if user is within rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_profile_id UUID,
  p_action_type TEXT,
  p_target_profile_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record RECORD;
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Get rate limit configuration
  SELECT max_count, window_duration_minutes, per_target
  INTO config_record
  FROM rate_limit_config
  WHERE action_type = p_action_type;
  
  IF NOT FOUND THEN
    RETURN json_build_object('allowed', true, 'message', 'No rate limit configured');
  END IF;
  
  -- Calculate window start time
  window_start_time := NOW() - (config_record.window_duration_minutes || ' minutes')::INTERVAL;
  
  -- Count current actions in window
  IF config_record.per_target AND p_target_profile_id IS NOT NULL THEN
    -- Per-target rate limiting
    SELECT COALESCE(SUM(count), 0)
    INTO current_count
    FROM user_action_limits
    WHERE profile_id = p_profile_id
      AND action_type = p_action_type
      AND target_profile_id = p_target_profile_id
      AND window_start >= window_start_time;
  ELSE
    -- Global rate limiting for user
    SELECT COALESCE(SUM(count), 0)
    INTO current_count
    FROM user_action_limits
    WHERE profile_id = p_profile_id
      AND action_type = p_action_type
      AND window_start >= window_start_time;
  END IF;
  
  -- Check if within limits
  IF current_count >= config_record.max_count THEN
    result := json_build_object(
      'allowed', false,
      'current_count', current_count,
      'max_count', config_record.max_count,
      'window_minutes', config_record.window_duration_minutes,
      'message', 'Rate limit exceeded'
    );
  ELSE
    result := json_build_object(
      'allowed', true,
      'current_count', current_count,
      'max_count', config_record.max_count,
      'window_minutes', config_record.window_duration_minutes,
      'message', 'Within rate limits'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_profile_id UUID,
  p_action_type TEXT,
  p_target_profile_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record RECORD;
  window_start_time TIMESTAMPTZ;
BEGIN
  -- Get rate limit configuration
  SELECT window_duration_minutes
  INTO config_record
  FROM rate_limit_config
  WHERE action_type = p_action_type;
  
  IF NOT FOUND THEN
    RETURN true; -- No rate limit configured, allow action
  END IF;
  
  -- Calculate current window start (rounded to nearest minute for consistency)
  window_start_time := date_trunc('minute', NOW());
  
  -- Insert or update rate limit record
  INSERT INTO user_action_limits (profile_id, action_type, target_profile_id, count, window_start)
  VALUES (p_profile_id, p_action_type, p_target_profile_id, 1, window_start_time)
  ON CONFLICT (profile_id, action_type, target_profile_id, window_start)
  DO UPDATE SET 
    count = user_action_limits.count + 1,
    updated_at = NOW();
  
  RETURN true;
END;
$$;

-- Function to send friend request with rate limiting
CREATE OR REPLACE FUNCTION public.send_friend_request_with_rate_limit(
  p_target_profile_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  rate_check JSON;
  global_check JSON;
  per_user_check JSON;
  result JSON;
BEGIN
  -- Get current authenticated user
  current_profile_id := auth.uid();
  IF current_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated', 'message', 'Not authenticated');
  END IF;
  
  -- Validate target user
  IF p_target_profile_id IS NULL OR p_target_profile_id = current_profile_id THEN
    RETURN json_build_object('success', false, 'error', 'invalid_target', 'message', 'Invalid target user');
  END IF;
  
  -- Check if friend request already exists
  IF EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE profile_id = current_profile_id 
    AND other_profile_id = p_target_profile_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate_request', 'message', 'Friend request already exists');
  END IF;
  
  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE (profile_id = current_profile_id AND friend_profile_id = p_target_profile_id)
    OR (profile_id = p_target_profile_id AND friend_profile_id = current_profile_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_friends', 'message', 'Already friends with this user');
  END IF;
  
  -- Check global rate limit
  global_check := check_rate_limit(current_profile_id, 'friend_request', NULL);
  IF NOT (global_check->>'allowed')::boolean THEN
    RETURN json_build_object('success', false, 'error', 'rate_limit_exceeded', 'message', global_check->>'message');
  END IF;
  
  -- Check per-user rate limit
  per_user_check := check_rate_limit(current_profile_id, 'friend_request_per_user', p_target_profile_id);
  IF NOT (per_user_check->>'allowed')::boolean THEN
    RETURN json_build_object('success', false, 'error', 'user_rate_limit_exceeded', 'message', per_user_check->>'message');
  END IF;
  
  -- Create friend request
  INSERT INTO friend_requests (profile_id, other_profile_id, status, created_at)
  VALUES (current_profile_id, p_target_profile_id, 'pending', NOW());
  
  -- Increment rate limit counters
  PERFORM increment_rate_limit(current_profile_id, 'friend_request', NULL);
  PERFORM increment_rate_limit(current_profile_id, 'friend_request_per_user', p_target_profile_id);
  
  RETURN json_build_object('success', true, 'message', 'Friend request sent successfully');
END;
$$;

-- 8. Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete records older than 7 days
  DELETE FROM user_action_limits
  WHERE window_start < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_with_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits TO authenticated;

-- 10. Create triggers for updated_at timestamps
CREATE TRIGGER update_user_action_limits_updated_at
    BEFORE UPDATE ON public.user_action_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();