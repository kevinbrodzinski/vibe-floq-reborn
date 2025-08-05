-- Fix search_floqs function to use correct friendship schema
DROP FUNCTION IF EXISTS public.search_floqs(numeric, numeric, numeric, text, text[], timestamptz, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.search_floqs(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 25,
  p_query text DEFAULT NULL,
  p_vibe_ids text[] DEFAULT NULL,
  p_time_from timestamptz DEFAULT NULL,
  p_time_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  primary_vibe text,
  participant_count bigint,
  distance_meters numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  creator_id uuid,
  creator_username text,
  creator_display_name text,
  creator_avatar_url text,
  user_joined_floq_id uuid,
  friends_going_count bigint,
  friends_going_avatars text[],
  friends_going_names text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) AS point
  ),
  friends AS (
    SELECT friend_id AS friend_profile_id
    FROM public.v_friends_with_presence 
    WHERE friend_state = 'accepted'
  ),
  nearby_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.description,
      f.primary_vibe::text,
      f.starts_at,
      f.ends_at,
      f.creator_id,
      ST_Distance(f.location::geography, ul.point::geography) AS distance_meters,
      p.username as creator_username,
      p.display_name as creator_display_name,
      p.avatar_url as creator_avatar_url
    FROM floqs f
    CROSS JOIN user_location ul
    LEFT JOIN profiles p ON p.id = f.creator_id
    WHERE f.deleted_at IS NULL
      AND f.ends_at > NOW()
      AND ST_DWithin(f.location::geography, ul.point::geography, p_radius_km * 1000)
      AND (p_query IS NULL OR f.title ILIKE '%' || p_query || '%')
      AND (p_vibe_ids IS NULL OR f.primary_vibe::text = ANY(p_vibe_ids))
      AND (p_time_from IS NULL OR f.starts_at >= p_time_from)
      AND (p_time_to IS NULL OR f.starts_at <= p_time_to)
  ),
  floq_participants AS (
    SELECT 
      nf.id,
      nf.title,
      nf.description,
      nf.primary_vibe,
      nf.starts_at,
      nf.ends_at,
      nf.creator_id,
      nf.distance_meters,
      nf.creator_username,
      nf.creator_display_name,
      nf.creator_avatar_url,
      COUNT(fp.profile_id) AS participant_count,
      CASE 
        WHEN auth.uid() IS NOT NULL AND EXISTS(
          SELECT 1 FROM floq_participants fp2 
          WHERE fp2.floq_id = nf.id AND fp2.profile_id = auth.uid()
        ) THEN nf.id 
        ELSE NULL 
      END AS user_joined_floq_id
    FROM nearby_floqs nf
    LEFT JOIN floq_participants fp ON fp.floq_id = nf.id
    GROUP BY nf.id, nf.title, nf.description, nf.primary_vibe, nf.starts_at, nf.ends_at, 
             nf.creator_id, nf.distance_meters, nf.creator_username, nf.creator_display_name, nf.creator_avatar_url
  ),
  friend_participants AS (
    SELECT 
      fp.floq_id,
      COUNT(fp.profile_id) AS friends_going_count,
      array_agg(p.avatar_url ORDER BY fp.joined_at) FILTER (WHERE p.avatar_url IS NOT NULL) AS friends_going_avatars,
      array_agg(COALESCE(p.display_name, p.username) ORDER BY fp.joined_at) FILTER (WHERE p.username IS NOT NULL) AS friends_going_names
    FROM floq_participants fp
    INNER JOIN friends f ON f.friend_profile_id = fp.profile_id
    LEFT JOIN profiles p ON p.id = fp.profile_id
    GROUP BY fp.floq_id
  )
  SELECT 
    fpt.id,
    fpt.title,
    fpt.description,
    fpt.primary_vibe,
    fpt.participant_count,
    fpt.distance_meters,
    fpt.starts_at,
    fpt.ends_at,
    fpt.creator_id,
    fpt.creator_username,
    fpt.creator_display_name,
    fpt.creator_avatar_url,
    fpt.user_joined_floq_id,
    COALESCE(frp.friends_going_count, 0) AS friends_going_count,
    COALESCE(frp.friends_going_avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(frp.friends_going_names, ARRAY[]::text[]) AS friends_going_names
  FROM floq_participants fpt
  LEFT JOIN friend_participants frp ON frp.floq_id = fpt.id
  ORDER BY fpt.distance_meters
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_floqs(numeric, numeric, numeric, text, text[], timestamptz, timestamptz, integer) TO anon, authenticated;