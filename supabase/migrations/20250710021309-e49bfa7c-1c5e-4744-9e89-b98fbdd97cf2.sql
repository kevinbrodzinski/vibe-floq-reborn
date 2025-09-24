-- Final corrected migration for people_crossed_paths_today function
-- Addresses: ST_Transform removal, bounding-box optimization, friend-graph table names

-- Drop the old function signature first
DROP FUNCTION IF EXISTS public.people_crossed_paths_today(numeric, numeric, numeric);

-- Create corrected indexes if they don't exist (safe operation)
CREATE INDEX IF NOT EXISTS idx_vibes_log_location 
ON public.vibes_log USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_vibes_log_user_ts 
ON public.vibes_log(user_id, ts DESC);

-- Create the refined function with corrected distance logic and bounding-box optimization
CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(
  in_me uuid,
  proximity_meters numeric DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  last_seen_ts timestamptz,
  last_seen_vibe public.vibe_enum,
  venue_name text,
  distance_meters numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_latest_location AS (
    SELECT 
      vl.location::geography AS geog,
      vl.ts AS my_ts
    FROM public.vibes_log vl
    WHERE vl.user_id = in_me
      AND vl.ts >= CURRENT_DATE
    ORDER BY vl.ts DESC
    LIMIT 1
  ),
  
  bounding_box_filter AS (
    SELECT DISTINCT vl.user_id
    FROM public.vibes_log vl, my_latest_location mll
    WHERE vl.ts >= CURRENT_DATE
      AND vl.user_id != in_me
      AND ST_Intersects(
        vl.location::geography,
        ST_Expand(mll.geog, proximity_meters)
      )
  ),
  
  latest_points AS (
    SELECT DISTINCT ON (vl.user_id)
      vl.user_id,
      vl.ts,
      vl.location::geography AS geog,
      vl.vibe,
      vl.venue_id
    FROM public.vibes_log vl, my_latest_location mll
    INNER JOIN bounding_box_filter bbf ON bbf.user_id = vl.user_id
    WHERE vl.ts >= CURRENT_DATE
      AND ST_DWithin(
        vl.location::geography,
        mll.geog,
        proximity_meters
      )
      -- Temporal overlap: their latest point vs our journey
      AND EXISTS (
        SELECT 1 FROM public.vibes_log vl2
        WHERE vl2.user_id = in_me
          AND vl2.ts >= CURRENT_DATE
          AND vl2.ts BETWEEN vl.ts - INTERVAL '30 minutes' 
                        AND vl.ts + INTERVAL '30 minutes'
      )
    ORDER BY vl.user_id, vl.ts DESC
  ),
  
  excluded_friends AS (
    SELECT f.friend_id AS user_id FROM public.friendships f WHERE f.user_id = in_me
    UNION
    SELECT f.user_id FROM public.friendships f WHERE f.friend_id = in_me
    UNION  
    SELECT fr.friend_id AS user_id FROM public.friend_requests fr 
    WHERE fr.user_id = in_me AND fr.status = 'accepted'
    UNION
    SELECT fr.user_id FROM public.friend_requests fr 
    WHERE fr.friend_id = in_me AND fr.status = 'accepted'
  )
  
  SELECT 
    lp.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    lp.ts AS last_seen_ts,
    lp.vibe AS last_seen_vibe,
    v.name AS venue_name,
    ROUND(ST_Distance(lp.geog, mll.geog)::numeric, 1) AS distance_meters
  FROM latest_points lp, my_latest_location mll
  LEFT JOIN public.profiles p ON p.id = lp.user_id
  LEFT JOIN public.venues v ON v.id = lp.venue_id
  WHERE NOT EXISTS (
    SELECT 1 FROM excluded_friends ef WHERE ef.user_id = lp.user_id
  )
  ORDER BY distance_meters ASC, lp.ts DESC
  LIMIT 50;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.people_crossed_paths_today(uuid, numeric) TO authenticated;