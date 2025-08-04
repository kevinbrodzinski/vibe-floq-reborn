-- Rate Limiting System Database Schema
-- Migration: Comprehensive rate limiting for friend requests and other user actions
-- Dependencies: Requires public.profiles table to exist

-- 1. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.user_action_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create rate limit configuration table
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  max_count INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Insert default rate limit configurations
INSERT INTO public.rate_limit_config (action_type, max_count, window_minutes, description)
VALUES 
  ('friend_request', 10, 60, 'Maximum friend requests per hour'),
  ('message_send', 100, 60, 'Maximum messages per hour'),
  ('venue_checkin', 20, 60, 'Maximum venue check-ins per hour'),
  ('profile_update', 5, 60, 'Maximum profile updates per hour')
ON CONFLICT (action_type) DO NOTHING;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_limits_profile_id ON public.user_action_limits(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_action_type ON public.user_action_limits(action_type);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_window_start ON public.user_action_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_user_action_limits_profile_action ON public.user_action_limits(profile_id, action_type);

-- 5. Enable Row Level Security
ALTER TABLE public.user_action_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Users can only see their own action limits
CREATE POLICY "Users can read their own action limits"
ON public.user_action_limits
FOR SELECT
USING (auth.uid() = profile_id);

-- System can manage action limits
CREATE POLICY "System can manage action limits"
ON public.user_action_limits
FOR ALL
WITH CHECK (true); -- This will be restricted by application logic

-- Rate limit config is readable by all authenticated users
CREATE POLICY "Authenticated users can read rate limit config"
ON public.rate_limit_config
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can modify rate limit config
CREATE POLICY "Admins can manage rate limit config"
ON public.rate_limit_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND (p.raw_user_meta_data->>'role' = 'admin' OR p.raw_user_meta_data->>'is_admin' = 'true')
  )
);

-- 7. Rate limiting functions

-- Function to check if an action is rate limited
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
  current_count INTEGER := 0;
  window_start_time TIMESTAMPTZ;
  is_limited BOOLEAN := FALSE;
  reset_time TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Get rate limit configuration
  SELECT max_count, window_minutes 
  INTO config_record
  FROM public.rate_limit_config 
  WHERE action_type = p_action_type;
  
  -- If no config found, allow the action
  IF NOT FOUND THEN
    RETURN json_build_object(
      'allowed', true,
      'reason', 'No rate limit configured'
    );
  END IF;
  
  -- Calculate window start time
  window_start_time := NOW() - (config_record.window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for the user and action type within the window
  SELECT COUNT(*), MIN(window_start)
  INTO current_count, reset_time
  FROM public.user_action_limits
  WHERE profile_id = p_profile_id
    AND action_type = p_action_type
    AND window_start >= window_start_time;
  
  -- Check if rate limited
  is_limited := current_count >= config_record.max_count;
  
  -- Calculate reset time
  IF reset_time IS NULL THEN
    reset_time := NOW() + (config_record.window_minutes || ' minutes')::INTERVAL;
  ELSE
    reset_time := reset_time + (config_record.window_minutes || ' minutes')::INTERVAL;
  END IF;
  
  -- Build result
  result := json_build_object(
    'allowed', NOT is_limited,
    'current_count', current_count,
    'max_count', config_record.max_count,
    'window_minutes', config_record.window_minutes,
    'reset_time', reset_time,
    'reason', CASE 
      WHEN is_limited THEN 'Rate limit exceeded'
      ELSE 'Action allowed'
    END
  );
  
  RETURN result;
END;
$$;

-- Function to record an action (increments the rate limit counter)
CREATE OR REPLACE FUNCTION public.record_action(
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
  rate_check JSON;
  config_record RECORD;
  window_start_time TIMESTAMPTZ;
BEGIN
  -- First check if the action is allowed
  rate_check := public.check_rate_limit(p_profile_id, p_action_type, p_target_profile_id);
  
  -- If not allowed, return the rate check result
  IF NOT (rate_check->>'allowed')::BOOLEAN THEN
    RETURN rate_check;
  END IF;
  
  -- Get configuration for window calculation
  SELECT window_minutes 
  INTO config_record
  FROM public.rate_limit_config 
  WHERE action_type = p_action_type;
  
  -- Calculate current window start
  window_start_time := DATE_TRUNC('hour', NOW()) + 
    (FLOOR(EXTRACT(MINUTE FROM NOW()) / config_record.window_minutes) * config_record.window_minutes || ' minutes')::INTERVAL;
  
  -- Record the action
  INSERT INTO public.user_action_limits (
    profile_id,
    action_type,
    count,
    window_start,
    created_at,
    updated_at
  )
  VALUES (
    p_profile_id,
    p_action_type,
    1,
    window_start_time,
    NOW(),
    NOW()
  )
  ON CONFLICT (profile_id, action_type, window_start)
  DO UPDATE SET
    count = user_action_limits.count + 1,
    updated_at = NOW();
  
  -- Return success with updated counts
  RETURN json_build_object(
    'success', true,
    'action_recorded', true,
    'new_count', (
      SELECT count 
      FROM public.user_action_limits 
      WHERE profile_id = p_profile_id 
        AND action_type = p_action_type 
        AND window_start = window_start_time
    )
  );
END;
$$;

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete records older than the maximum window size (24 hours)
  DELETE FROM public.user_action_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 8. Enhanced friend request function with rate limiting
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
  existing_request RECORD;
  existing_friendship RECORD;
  result JSON;
BEGIN
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate input
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  IF p_target_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Target profile ID is required'
    );
  END IF;
  
  IF current_profile_id = p_target_profile_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot send friend request to yourself'
    );
  END IF;
  
  -- Check rate limit
  rate_check := public.check_rate_limit(current_profile_id, 'friend_request', p_target_profile_id);
  
  IF NOT (rate_check->>'allowed')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'rate_limit_info', rate_check
    );
  END IF;
  
  -- Check if target profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_profile_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Target profile not found'
    );
  END IF;
  
  -- Check for existing friendship
  SELECT * INTO existing_friendship
  FROM public.friendships
  WHERE (user_low = LEAST(current_profile_id, p_target_profile_id) 
         AND user_high = GREATEST(current_profile_id, p_target_profile_id));
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Friendship already exists',
      'friendship_status', existing_friendship.friend_state
    );
  END IF;
  
  -- Check for existing pending request (in either direction)
  SELECT * INTO existing_request
  FROM public.friend_requests
  WHERE (profile_id = current_profile_id AND other_profile_id = p_target_profile_id AND status = 'pending')
     OR (profile_id = p_target_profile_id AND other_profile_id = current_profile_id AND status = 'pending');
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Friend request already exists',
      'request_direction', CASE 
        WHEN existing_request.profile_id = current_profile_id THEN 'outgoing'
        ELSE 'incoming'
      END
    );
  END IF;
  
  -- Record the rate limited action
  PERFORM public.record_action(current_profile_id, 'friend_request', p_target_profile_id);
  
  -- Create friend request
  INSERT INTO public.friend_requests (
    profile_id,
    other_profile_id,
    status,
    created_at
  )
  VALUES (
    current_profile_id,
    p_target_profile_id,
    'pending',
    NOW()
  );
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Friend request sent successfully',
    'request_id', (
      SELECT id FROM public.friend_requests 
      WHERE profile_id = current_profile_id 
        AND other_profile_id = p_target_profile_id 
        AND status = 'pending'
      ORDER BY created_at DESC 
      LIMIT 1
    )
  );
  
  RETURN result;
END;
$$;

-- 9. Create a function to reset rate limits for a user (admin only)
CREATE OR REPLACE FUNCTION public.reset_user_rate_limits(
  p_profile_id UUID,
  p_action_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  deleted_count INTEGER;
BEGIN
  current_profile_id := auth.uid();
  
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = current_profile_id 
    AND (p.raw_user_meta_data->>'role' = 'admin' OR p.raw_user_meta_data->>'is_admin' = 'true')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions'
    );
  END IF;
  
  -- Delete rate limit records
  IF p_action_type IS NULL THEN
    -- Reset all rate limits for the user
    DELETE FROM public.user_action_limits
    WHERE profile_id = p_profile_id;
  ELSE
    -- Reset specific action type
    DELETE FROM public.user_action_limits
    WHERE profile_id = p_profile_id AND action_type = p_action_type;
  END IF;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Rate limits reset successfully',
    'records_deleted', deleted_count
  );
END;
$$;

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 11. Add constraint to ensure window_start alignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_action_limits_unique_window
ON public.user_action_limits(profile_id, action_type, window_start);