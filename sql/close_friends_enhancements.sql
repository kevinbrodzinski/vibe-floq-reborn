-- Close Friends System Enhancement
-- Adds functionality to the existing is_close field in friendships table

BEGIN;

-- Add index for efficient close friends queries
CREATE INDEX IF NOT EXISTS idx_friendships_close_friends 
ON public.friendships (user_low, user_high) 
WHERE is_close = true AND friend_state = 'accepted';

-- Add index for reverse lookups
CREATE INDEX IF NOT EXISTS idx_friendships_close_friends_reverse 
ON public.friendships (user_high, user_low) 
WHERE is_close = true AND friend_state = 'accepted';

-- Function to toggle close friend status
CREATE OR REPLACE FUNCTION public.toggle_close_friend(
  target_user_id uuid,
  is_close_friend boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  pair RECORD;
  updated_rows integer;
BEGIN
  -- Validate authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Prevent self-targeting
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot modify close friend status with yourself';
  END IF;
  
  -- Get normalized pair
  SELECT * INTO pair FROM norm_pair(current_user_id, target_user_id);
  
  -- Update close friend status (only if friendship exists and is accepted)
  UPDATE public.friendships 
  SET is_close = is_close_friend
  WHERE user_low = pair.low 
    AND user_high = pair.high 
    AND friend_state = 'accepted';
    
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Return whether the update was successful
  RETURN updated_rows > 0;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.toggle_close_friend(uuid, boolean) TO authenticated;

-- Function to get close friends list
CREATE OR REPLACE FUNCTION public.get_close_friends(user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  friend_id uuid,
  friend_name text,
  friend_avatar_url text,
  friendship_created_at timestamptz,
  close_since timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate authentication
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_low = user_id THEN f.user_high
      ELSE f.user_low
    END as friend_id,
    p.display_name as friend_name,
    p.avatar_url as friend_avatar_url,
    f.created_at as friendship_created_at,
    f.updated_at as close_since
  FROM public.friendships f
  JOIN public.profiles p ON (
    CASE 
      WHEN f.user_low = user_id THEN f.user_high
      ELSE f.user_low
    END = p.id
  )
  WHERE (f.user_low = user_id OR f.user_high = user_id)
    AND f.friend_state = 'accepted'
    AND f.is_close = true
  ORDER BY f.updated_at DESC;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_close_friends(uuid) TO authenticated;

-- Add RLS policy for close friends privacy
CREATE POLICY "close_friends_visibility" ON public.friendships
FOR SELECT USING (
  -- Users can see their own close friend relationships
  (auth.uid() = user_low OR auth.uid() = user_high)
  OR 
  -- Close friends can see each other's close friend status in mutual relationships
  (
    is_close = true 
    AND friend_state = 'accepted'
    AND EXISTS (
      SELECT 1 FROM public.friendships mutual
      WHERE mutual.friend_state = 'accepted'
        AND mutual.is_close = true
        AND (
          (mutual.user_low = auth.uid() AND mutual.user_high IN (user_low, user_high))
          OR
          (mutual.user_high = auth.uid() AND mutual.user_low IN (user_low, user_high))
        )
    )
  )
);

COMMIT;