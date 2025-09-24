-- Final polish for search_floqs function (fixed array slicing)
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Early exit for guest users (no friend data needed)
  IF _viewer_id IS NULL THEN
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
        ) AS distance_m
      FROM public.floqs f
      WHERE f.visibility = ANY(p_visibilities)
        AND f.deleted_at IS NULL
        AND ST_DWithin(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_km * 1000
        )
        -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
        AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
        AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
        -- Time window overlap logic
        AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
        AND f.starts_at <= p_time_to
    )
    SELECT 
      b.id,
      b.title,
      b.primary_vibe,
      b.starts_at,
      b.ends_at,
      b.distance_m,
      COALESCE(pc.participant_count, 0) AS participant_count,
      0 AS friends_going_count,
      ARRAY[]::text[] AS friends_going_avatars,
      ARRAY[]::text[] AS friends_going_names
    FROM base_floqs b
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = b.id
    ) pc ON true
    ORDER BY b.distance_m, pc.participant_count DESC, b.starts_at
    LIMIT p_limit;
    
    RETURN;
  END IF;

  -- Main query for authenticated users with friend data
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
      ) AS distance_m
    FROM public.floqs f
    WHERE f.visibility = ANY(p_visibilities)
      AND f.deleted_at IS NULL
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
      AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
      -- Time window overlap logic
      AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
      AND f.starts_at <= p_time_to
  ),
  friends AS (
    SELECT CASE WHEN f.user_a = _viewer_id THEN f.user_b ELSE f.user_a END AS user_id
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (_viewer_id IN (f.user_a, f.user_b))
  ),
  joined AS (
    SELECT 
      b.id AS floq_id,
      COUNT(fp.user_id)::int AS cnt,
      (array_agg(p.avatar_url ORDER BY fp.joined_at DESC) FILTER (WHERE p.avatar_url IS NOT NULL))[1:4] AS avatars,
      (array_agg(p.display_name ORDER BY fp.joined_at DESC))[1:4] AS names
    FROM base_floqs b
    JOIN public.floq_participants fp ON fp.floq_id = b.id
    JOIN friends f ON f.user_id = fp.user_id
    JOIN public.profiles p ON p.id = fp.user_id
    GROUP BY b.id
  )
  SELECT 
    b.id,
    b.title,
    b.primary_vibe,
    b.starts_at,
    b.ends_at,
    b.distance_m,
    COALESCE(pc.participant_count, 0) AS participant_count,
    COALESCE(j.cnt, 0) AS friends_going_count,
    COALESCE(j.avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(j.names, ARRAY[]::text[]) AS friends_going_names
  FROM base_floqs b
  LEFT JOIN joined j ON j.floq_id = b.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = b.id
  ) pc ON true
  ORDER BY b.distance_m, COALESCE(j.cnt, 0) DESC, pc.participant_count DESC
  LIMIT p_limit;
END;
$$;

-- Ensure function owner is postgres
ALTER FUNCTION public.search_floqs(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, vibe_enum[], 
  TIMESTAMPTZ, TIMESTAMPTZ, INT, TEXT[], uuid
) OWNER TO postgres;