-- ==============================================
-- Fix friend request accept RPC and ensure find_or_create_dm exists
-- ==============================================

/*
  🛠 1. Drop the legacy accept RPC that used "#=" (if it is still present)
*/
DROP FUNCTION IF EXISTS public.accept_friend_request(uuid);

/*
  🛠 2. Re-create a safe version that returns friend_requests record
*/
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
  
  -- Create friendship
  INSERT INTO friendships (user_id, friend_id)
  VALUES (result.user_id, result.friend_id)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO friendships (user_id, friend_id)
  VALUES (result.friend_id, result.user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

/*
  🛠 3. Ensure find_or_create_dm function exists for messaging
*/
CREATE OR REPLACE FUNCTION public.find_or_create_dm(a uuid, b uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_id uuid;
BEGIN
  -- Try to find existing thread
  SELECT id INTO thread_id
  FROM direct_threads
  WHERE (member_a = a AND member_b = b) OR (member_a = b AND member_b = a);
  
  -- If not found, create new thread
  IF thread_id IS NULL THEN
    INSERT INTO direct_threads (member_a, member_b)
    VALUES (LEAST(a, b), GREATEST(a, b))
    RETURNING id INTO thread_id;
  END IF;
  
  RETURN thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_or_create_dm(uuid, uuid) TO authenticated;