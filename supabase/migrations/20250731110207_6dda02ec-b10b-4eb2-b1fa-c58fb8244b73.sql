-- Drop the friends table and fix search_floqs function
BEGIN;

-- 1. Drop the friends table (no longer used, replaced by friendships)
DROP TABLE IF EXISTS public.friends CASCADE;

-- 2. Fix the search_floqs function to use friendships table correctly
CREATE OR REPLACE FUNCTION public.search_floqs(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 25,
  p_query text DEFAULT NULL,
  p_vibe_ids text[] DEFAULT NULL,
  p_time_from timestamp with time zone DEFAULT NULL,
  p_time_to timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  location geometry,
  lat numeric,
  lng numeric,
  primary_vibe vibe_enum,
  creator_id uuid,
  creator_username text,
  creator_display_name text,
  creator_avatar_url text,
  participant_count bigint,
  distance_m double precision,
  friends_going_count bigint,
  friends_going_avatars text[],
  friends_going_names text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid := auth.uid();
  search_point geometry := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  bbox geometry := ST_Expand(search_point::geography, p_radius_km * 1000)::geometry;
BEGIN
  RETURN QUERY
  WITH friends_going AS (
    SELECT 
      fp.floq_id,
      COUNT(*)::bigint as friends_count,
      array_agg(DISTINCT p.avatar_url) FILTER (WHERE p.avatar_url IS NOT NULL) as avatars,
      array_agg(DISTINCT COALESCE(p.display_name, p.username)) FILTER (WHERE COALESCE(p.display_name, p.username) IS NOT NULL) as names
    FROM floq_participants fp
    JOIN profiles p ON p.id = fp.profile_id
    WHERE viewer_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM friendships fs 
        WHERE ((fs.user_low = viewer_id AND fs.user_high = fp.profile_id)
               OR (fs.user_high = viewer_id AND fs.user_low = fp.profile_id))
          AND fs.friend_state = 'accepted'
      )
    GROUP BY fp.floq_id
  )
  SELECT 
    f.id,
    f.title,
    f.description,
    f.starts_at,
    f.ends_at,
    f.location,
    ST_Y(f.location)::numeric as lat,
    ST_X(f.location)::numeric as lng,
    f.primary_vibe,
    f.creator_id,
    creator.username as creator_username,
    creator.display_name as creator_display_name,
    creator.avatar_url as creator_avatar_url,
    COALESCE(participant_counts.count, 0) as participant_count,
    ST_Distance(f.location::geography, search_point::geography) as distance_m,
    COALESCE(fg.friends_count, 0) as friends_going_count,
    COALESCE(fg.avatars, ARRAY[]::text[]) as friends_going_avatars,
    COALESCE(fg.names, ARRAY[]::text[]) as friends_going_names
  FROM floqs f
  LEFT JOIN profiles creator ON creator.id = f.creator_id
  LEFT JOIN friends_going fg ON fg.floq_id = f.id
  LEFT JOIN (
    SELECT floq_id, COUNT(*) as count
    FROM floq_participants 
    GROUP BY floq_id
  ) participant_counts ON participant_counts.floq_id = f.id
  WHERE f.deleted_at IS NULL
    AND f.ends_at > NOW()
    AND ST_Intersects(f.location, bbox)
    AND (p_query IS NULL OR f.title ILIKE '%' || p_query || '%' OR f.description ILIKE '%' || p_query || '%')
    AND (p_vibe_ids IS NULL OR f.primary_vibe::text = ANY(p_vibe_ids))
    AND (p_time_from IS NULL OR f.starts_at >= p_time_from)
    AND (p_time_to IS NULL OR f.starts_at <= p_time_to)
  ORDER BY distance_m
  LIMIT p_limit;
END;
$$;

COMMIT;