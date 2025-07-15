-- Optimize search_floqs function with early guest exit and performance improvements
CREATE OR REPLACE FUNCTION public.search_floqs(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION, 
  p_radius_km DOUBLE PRECISION DEFAULT 25,
  p_query TEXT DEFAULT '',
  p_vibe_ids vibe_enum[] DEFAULT '{}',
  p_time_from TIMESTAMPTZ DEFAULT now(),
  p_time_to TIMESTAMPTZ DEFAULT now() + interval '7 days',
  p_limit INT DEFAULT 100,
  p_visibilities TEXT[] DEFAULT ARRAY['public'],
  _viewer_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  title text,
  primary_vibe vibe_enum,
  starts_at timestamptz,
  ends_at timestamptz,
  distance_m double precision,
  participant_count bigint,
  friends_going_count integer,
  friends_going_avatars text[],
  friends_going_names text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Early exit for guests - skip friends CTE compilation entirely
  IF _viewer_id IS NULL THEN
    RETURN QUERY
    SELECT 
      f.id,
      f.title,
      f.primary_vibe,
      f.starts_at,
      f.ends_at,
      ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) as distance_m,
      COALESCE(pc.participant_count, 0) as participant_count,
      0 as friends_going_count,
      ARRAY[]::text[] as friends_going_avatars,
      ARRAY[]::text[] as friends_going_names
    FROM public.floqs f
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = f.id
    ) pc ON true
    WHERE f.deleted_at IS NULL
      AND f.visibility = ANY(p_visibilities)
      AND (p_vibe_ids = '{}' OR f.primary_vibe = ANY(p_vibe_ids))
      AND f.starts_at BETWEEN p_time_from AND p_time_to
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
    ORDER BY distance_m
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Authenticated users with friends support
  RETURN QUERY
  WITH base_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.primary_vibe,
      f.starts_at,
      f.ends_at,
      ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) as distance_m,
      ST_X(f.location::geometry) as loc_x,
      ST_Y(f.location::geometry) as loc_y
    FROM public.floqs f
    WHERE f.deleted_at IS NULL
      AND f.visibility = ANY(p_visibilities)
      AND (p_vibe_ids = '{}' OR f.primary_vibe = ANY(p_vibe_ids))
      AND f.starts_at BETWEEN p_time_from AND p_time_to
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
  ),
  friends AS (
    SELECT friend_id as user_id
    FROM public.friendships
    WHERE user_id = _viewer_id
    UNION
    SELECT user_id
    FROM public.friendships  
    WHERE friend_id = _viewer_id
  ),
  joined AS (
    SELECT 
      b.id as floq_id,
      COUNT(fp.user_id) as cnt,
      array_agg(p.avatar_url ORDER BY fp.joined_at DESC) 
        FILTER (WHERE p.avatar_url IS NOT NULL) as avatars,
      array_agg(p.display_name ORDER BY fp.joined_at DESC) as names
    FROM base_floqs b
    JOIN public.floq_participants fp ON fp.floq_id = b.id
    JOIN friends f ON f.user_id = fp.user_id
    JOIN public.profiles p ON p.id = fp.user_id
    GROUP BY b.id, b.loc_x, b.loc_y
  )
  SELECT 
    b.id,
    b.title,
    b.primary_vibe,
    b.starts_at,
    b.ends_at,
    b.distance_m,
    COALESCE(pc.participant_count, 0) as participant_count,
    COALESCE(j.cnt, 0)::integer as friends_going_count,
    COALESCE(j.avatars[1:4], ARRAY[]::text[]) as friends_going_avatars,
    COALESCE(j.names[1:4], ARRAY[]::text[]) as friends_going_names
  FROM base_floqs b
  LEFT JOIN joined j ON j.floq_id = b.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = b.id
  ) pc ON true
  ORDER BY 
    b.distance_m,                       -- primary key: proximity
    COALESCE(j.cnt,0) DESC,             -- friends_going_count (more friends first)
    participant_count DESC              -- general popularity fallback
  LIMIT p_limit;
END;
$$;