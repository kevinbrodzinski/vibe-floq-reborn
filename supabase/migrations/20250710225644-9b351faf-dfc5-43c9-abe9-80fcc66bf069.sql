-- Create request_friendship RPC function
CREATE OR REPLACE FUNCTION public.request_friendship(_target uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Prevent self-friend and duplicates
  IF _target = auth.uid() THEN
    RAISE EXCEPTION 'Cannot friend yourself';
  END IF;

  INSERT INTO friend_requests (user_id, friend_id, status)
  VALUES (auth.uid(), _target, 'pending')
  ON CONFLICT (user_id, friend_id) DO UPDATE
    SET status = 'pending', created_at = now(), responded_at = NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.request_friendship(uuid) TO authenticated;

-- Add unique constraint to prevent duplicate requests
ALTER TABLE friend_requests 
ADD CONSTRAINT IF NOT EXISTS friend_requests_user_friend_unique 
UNIQUE (user_id, friend_id);