-- Fix friends_recent_at_venue RPC with correct parameter names and add helpful indexes
BEGIN;
SET search_path = public;

-- Speed-ups (safe to re-run)
CREATE INDEX IF NOT EXISTS idx_venue_visits_venue_arrived ON public.venue_visits(venue_id, arrived_at DESC);
CREATE INDEX IF NOT EXISTS idx_venue_visits_profile_venue ON public.venue_visits(profile_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_friendships_profile_a ON public.friendships(profile_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_profile_b ON public.friendships(profile_b_id);

-- RPC: friends_recent_at_venue(profile -> friends -> recent visits to venue)
-- Fixed parameter names to match what the client calls
CREATE OR REPLACE FUNCTION public.friends_recent_at_venue(
  p_profile_id uuid,
  p_venue_id   uuid,
  p_days_back  integer DEFAULT 14
)
RETURNS TABLE (friend_id uuid, arrived_at timestamptz)
LANGUAGE sql
STABLE
AS $$
  WITH myfriends AS (
    SELECT CASE
             WHEN f.profile_a_id = p_profile_id THEN f.profile_b_id
             ELSE f.profile_a_id
           END AS friend_id
    FROM public.friendships f
    WHERE (f.profile_a_id = p_profile_id OR f.profile_b_id = p_profile_id)
      AND f.status = 'accepted'
  )
  SELECT v.profile_id AS friend_id, v.arrived_at
  FROM public.venue_visits v
  JOIN myfriends mf ON mf.friend_id = v.profile_id
  WHERE v.venue_id = p_venue_id
    AND v.arrived_at >= now() - make_interval(days => p_days_back)
  ORDER BY v.arrived_at DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.friends_recent_at_venue(uuid,uuid,integer) TO authenticated;

COMMIT;