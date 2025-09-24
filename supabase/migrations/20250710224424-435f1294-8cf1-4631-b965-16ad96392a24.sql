-- Update respond_friend_request function to match TypeScript types
CREATE OR REPLACE FUNCTION public.respond_friend_request(request_user_id uuid, response_type text)
 RETURNS friend_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;