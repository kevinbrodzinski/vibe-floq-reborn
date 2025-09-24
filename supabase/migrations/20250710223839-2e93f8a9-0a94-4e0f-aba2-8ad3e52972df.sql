-- Create improved respond_friend_request function with micro-improvements
CREATE OR REPLACE FUNCTION public.respond_friend_request(
  request_user_id UUID,
  response_type TEXT
)
RETURNS public.friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_request public.friend_requests;
BEGIN
  -- Validate response_type early (improvement #4)
  IF response_type NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response_type: %. Must be accepted or declined.', response_type;
  END IF;

  -- Atomic update: check exists + update in one operation (improvement #3)
  -- Return the updated row for optimistic cache updates (improvement #2)
  UPDATE public.friend_requests 
  SET 
    status = response_type,
    responded_at = NOW()  -- improvement #5: analytics/dispute resolution
  WHERE 
    user_id = request_user_id 
    AND friend_id = auth.uid() 
    AND status = 'pending'
  RETURNING * INTO updated_request;

  -- Check if any row was actually updated
  IF updated_request IS NULL THEN
    RAISE EXCEPTION 'No pending friend request found from user %', request_user_id;
  END IF;

  -- If accepted, create friendship
  IF response_type = 'accepted' THEN
    -- Insert friendship using INSERT ... ON CONFLICT for deduplication safety
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (request_user_id, auth.uid())
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Insert reverse friendship for mutual relationship
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (auth.uid(), request_user_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END IF;

  RETURN updated_request;
END;
$$;

-- Add responded_at column to friend_requests if it doesn't exist (improvement #5)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'friend_requests' 
    AND column_name = 'responded_at'
  ) THEN
    ALTER TABLE public.friend_requests 
    ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add unique constraint to friendships for true deduplication (improvement #6)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friendships_user_friend_unique'
  ) THEN
    ALTER TABLE public.friendships 
    ADD CONSTRAINT friendships_user_friend_unique UNIQUE (user_id, friend_id);
  END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.respond_friend_request TO authenticated;