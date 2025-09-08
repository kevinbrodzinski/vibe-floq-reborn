-- Fix friendship helper functions with correct column names
DROP FUNCTION IF EXISTS public._friend_pair(uuid, uuid);
DROP FUNCTION IF EXISTS public.are_friends(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_close_friend(uuid, uuid);
DROP FUNCTION IF EXISTS public.friend_audience(uuid, uuid);

-- 1) Normalize a pair to canonical order
CREATE OR REPLACE FUNCTION public._friend_pair(a uuid, b uuid)
RETURNS TABLE(low uuid, high uuid)
LANGUAGE SQL IMMUTABLE AS $$
  SELECT LEAST(a,b) AS low, GREATEST(a,b) AS high
$$;

-- 2) Are they accepted friends?
CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE SQL STABLE AS $$
  WITH p AS (SELECT (SELECT low FROM _friend_pair(a,b)) low,
                    (SELECT high FROM _friend_pair(a,b)) high)
  SELECT EXISTS(
    SELECT 1 FROM public.friendships f, p
    WHERE f.profile_low = p.low
      AND f.profile_high = p.high
      AND f.friend_state = 'accepted'
  )
$$;

-- 3) Are they close friends? (subset of accepted)
CREATE OR REPLACE FUNCTION public.is_close_friend(a uuid, b uuid)
RETURNS boolean
LANGUAGE SQL STABLE AS $$
  WITH p AS (SELECT (SELECT low FROM _friend_pair(a,b)) low,
                    (SELECT high FROM _friend_pair(a,b)) high)
  SELECT EXISTS(
    SELECT 1 FROM public.friendships f, p
    WHERE f.profile_low = p.low
      AND f.profile_high = p.high
      AND f.friend_state = 'accepted'
      AND f.is_close = true
  )
$$;

-- 4) Audience classification: public | friends | close
CREATE OR REPLACE FUNCTION public.friend_audience(a uuid, b uuid)
RETURNS text
LANGUAGE SQL STABLE AS $$
  SELECT CASE
    WHEN public.is_close_friend(a,b) THEN 'close'
    WHEN public.are_friends(a,b)     THEN 'friends'
    ELSE 'public'
  END
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public._friend_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_close_friend(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_audience(uuid, uuid) TO authenticated;