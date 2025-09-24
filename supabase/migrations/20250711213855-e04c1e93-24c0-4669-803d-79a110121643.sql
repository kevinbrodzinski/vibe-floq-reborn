-- Fix accept_friend_request to use canonical friendship ordering
CREATE OR REPLACE FUNCTION public.accept_friend_request(req_id uuid)
RETURNS friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result friend_requests;
BEGIN
  UPDATE friend_requests
     SET status       = 'accepted',
         responded_at = now()
   WHERE id        = req_id
     AND friend_id = auth.uid()          -- only the receiver can accept
  RETURNING * INTO result;
  
  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or access denied';
  END IF;
  
  -- single canonical insert – passes friendships_check
  INSERT INTO friendships (user_id, friend_id)
  VALUES (LEAST(result.user_id, result.friend_id),
          GREATEST(result.user_id, result.friend_id))
  ON CONFLICT DO NOTHING;
  
  RETURN result;
END;
$$;