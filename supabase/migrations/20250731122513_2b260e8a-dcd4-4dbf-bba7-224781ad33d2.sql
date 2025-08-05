-- Update search_floqs function to match hook expectations
DROP FUNCTION IF EXISTS public.search_floqs(double precision, double precision, double precision, text, text[], timestamptz, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.search_floqs(
  p_lat double precision,
  p_lng double precision, 
  p_radius_km double precision DEFAULT 25,
  p_query text DEFAULT '',
  p_vibe_ids text[] DEFAULT '{}',
  p_time_from timestamptz DEFAULT now(),
  p_time_to timestamptz DEFAULT (now() + interval '7 days'),
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  primary_vibe text,
  participant_count bigint,
  distance_m integer,
  starts_at timestamptz,
  ends_at timestamptz,
  creator_id uuid,
  creator_username text,
  creator_display_name text,
  creator_avatar_url text,
  user_joined_floq_id uuid,
  friends_going_count integer,
  friends_going_avatars text[],
  friends_going_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  search_point geometry;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Create search point
  search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  
  RETURN QUERY
  WITH floq_base AS (
    SELECT 
      f.id,
      f.title,
      f.description,
      f.primary_vibe::text,
      f.starts_at,
      f.ends_at,
      f.location,
      f.creator_id,
      ST_DistanceSphere(f.location, search_point)::integer as distance_m
    FROM floqs f
    WHERE 
      f.deleted_at IS NULL
      AND f.ends_at > now()
      AND (p_radius_km = 0 OR ST_DWithin(f.location::geography, search_point::geography, p_radius_km * 1000))
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%' OR f.description ILIKE '%' || p_query || '%')
      AND (array_length(p_vibe_ids, 1) IS NULL OR f.primary_vibe::text = ANY(p_vibe_ids))
      AND f.starts_at BETWEEN p_time_from AND p_time_to
  ),
  floq_participants AS (
    SELECT 
      fp.floq_id,
      COUNT(*) as participant_count,
      CASE WHEN current_user_id IS NOT NULL THEN
        MAX(CASE WHEN fp.profile_id = current_user_id THEN fp.floq_id END)
      ELSE NULL END as user_joined_floq_id
    FROM floq_participants fp
    GROUP BY fp.floq_id
  ),
  creator_info AS (
    SELECT 
      p.id as creator_id,
      p.username::text as creator_username,
      p.display_name as creator_display_name,
      p.avatar_url as creator_avatar_url
    FROM profiles p
  ),
  friend_participants AS (
    SELECT 
      fp.floq_id,
      COUNT(*)::integer as friends_going_count,
      array_agg(p.avatar_url) FILTER (WHERE p.avatar_url IS NOT NULL) as friends_going_avatars,
      array_agg(COALESCE(p.display_name, p.username::text)) as friends_going_names
    FROM floq_participants fp
    JOIN profiles p ON p.id = fp.profile_id
    WHERE current_user_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM friend_relationships fr 
        WHERE ((fr.user_a_id = current_user_id AND fr.user_b_id = fp.profile_id) 
               OR (fr.user_b_id = current_user_id AND fr.user_a_id = fp.profile_id))
               AND fr.status = 'accepted'
      )
    GROUP BY fp.floq_id
  )
  SELECT 
    fb.id,
    fb.title,
    fb.description,
    fb.primary_vibe,
    COALESCE(fp.participant_count, 0) as participant_count,
    fb.distance_m,
    fb.starts_at,
    fb.ends_at,
    fb.creator_id,
    ci.creator_username,
    ci.creator_display_name,
    ci.creator_avatar_url,
    fp.user_joined_floq_id,
    COALESCE(frp.friends_going_count, 0) as friends_going_count,
    COALESCE(frp.friends_going_avatars, '{}') as friends_going_avatars,
    COALESCE(frp.friends_going_names, '{}') as friends_going_names
  FROM floq_base fb
  LEFT JOIN floq_participants fp ON fp.floq_id = fb.id
  LEFT JOIN creator_info ci ON ci.creator_id = fb.creator_id
  LEFT JOIN friend_participants frp ON frp.floq_id = fb.id
  ORDER BY fb.distance_m
  LIMIT p_limit;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_floqs(double precision, double precision, double precision, text, text[], timestamptz, timestamptz, integer) TO anon, authenticated;