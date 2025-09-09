-- FriendFlows server-side RPC for venue boost
CREATE OR REPLACE FUNCTION public.recent_friend_venue_counts(profile uuid, since timestamptz)
RETURNS TABLE (venue_id uuid, friend_count bigint)
LANGUAGE sql
STABLE
AS $$
WITH friends AS (
  SELECT CASE WHEN f.profile_low = profile THEN f.profile_high ELSE f.profile_low END AS fid
  FROM public.friendships f
  WHERE f.friend_state = 'accepted' AND (f.profile_low = profile OR f.profile_high = profile)
),
seg AS (
  SELECT fs.venue_id
  FROM   public.flow_segments fs
  JOIN   public.flows fl ON fl.id = fs.flow_id
  WHERE  fs.venue_id IS NOT NULL
    AND  fl.profile_id IN (SELECT fid FROM friends)
    AND  fs.arrived_at >= since
)
SELECT venue_id, COUNT(*)::bigint AS friend_count
FROM seg
GROUP BY venue_id
ORDER BY friend_count DESC;
$$;