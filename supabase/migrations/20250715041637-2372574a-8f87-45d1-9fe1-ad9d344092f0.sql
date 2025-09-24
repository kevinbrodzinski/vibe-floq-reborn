-- Create optimized search_floqs function with friends support
CREATE OR REPLACE FUNCTION public.search_floqs(
  p_lat           DOUBLE PRECISION,
  p_lng           DOUBLE PRECISION,
  p_radius_km     DOUBLE PRECISION DEFAULT 25,
  p_query         TEXT            DEFAULT '',
  p_vibe_ids      vibe_enum[]     DEFAULT '{}',
  p_time_from     TIMESTAMPTZ     DEFAULT now(),
  p_time_to       TIMESTAMPTZ     DEFAULT now() + interval '7 days',
  p_limit         INT             DEFAULT 100,
  p_visibilities  TEXT[]          DEFAULT ARRAY['public'],
  _viewer_id      uuid            DEFAULT auth.uid()
)
RETURNS TABLE (
  id                     uuid,
  title                  text,
  primary_vibe           vibe_enum,
  starts_at              timestamptz,
  ends_at                timestamptz,
  distance_m             double precision,
  participant_count      bigint,
  friends_going_count    integer,
  friends_going_avatars  text[],
  friends_going_names    text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    base AS (
      SELECT f.*, 
             ST_Distance(
               f.location::geography, 
               ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography
             ) AS distance_m,
             ( SELECT COUNT(*) FROM floq_participants fp WHERE fp.floq_id = f.id ) AS participant_count
      FROM   floqs f
      WHERE  f.deleted_at IS NULL
        AND  f.visibility = ANY(p_visibilities)
        AND  ST_DWithin(
               f.location::geography,
               ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography,
               p_radius_km*1000
             )
        AND  (p_query = '' OR lower(f.title) % lower(p_query))
        AND  (p_vibe_ids IS NULL OR cardinality(p_vibe_ids)=0 OR f.primary_vibe = ANY(p_vibe_ids))
        AND  COALESCE(f.ends_at, f.starts_at+interval '4 hours') >= p_time_from
        AND  f.starts_at <= p_time_to
      ORDER BY distance_m
      LIMIT p_limit
    ),
    friends AS (
      SELECT DISTINCT
             CASE WHEN fr.user_a = _viewer_id THEN fr.user_b ELSE fr.user_a END AS friend_id
      FROM   friends fr
      WHERE  fr.status = 'accepted'
        AND  _viewer_id IS NOT NULL
        AND  _viewer_id IN (fr.user_a, fr.user_b)
    ),
    joined AS (
      SELECT fp.floq_id,
             COUNT(*)                 AS cnt,
             array_remove(
               (array_agg(p.avatar_url ORDER BY fp.joined_at DESC))[1:4],
               NULL
             ) AS avatars,
             array_remove(
               (array_agg(p.display_name ORDER BY fp.joined_at DESC))[1:4],
               NULL
             ) AS names
      FROM   floq_participants fp
      JOIN   friends f  ON f.friend_id = fp.user_id
      JOIN   profiles p ON p.id        = fp.user_id
      GROUP  BY fp.floq_id
    )
  SELECT b.id, b.title, b.primary_vibe,
         b.starts_at, b.ends_at, b.distance_m, b.participant_count,
         COALESCE(j.cnt,0)        AS friends_going_count,
         COALESCE(j.avatars,'{}') AS friends_going_avatars,
         COALESCE(j.names,'{}')   AS friends_going_names
  FROM   base b
  LEFT JOIN joined j ON b.id = j.floq_id
  ORDER BY COALESCE(j.cnt,0) DESC, b.distance_m;
$$;

-- Set function owner for security
ALTER FUNCTION public.search_floqs(
   double precision, double precision, double precision,
   text, vibe_enum[], timestamptz, timestamptz,
   int, text[], uuid)
OWNER TO postgres;

-- Create supporting indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_floqs_location_gist
  ON floqs USING gist (location);

CREATE INDEX IF NOT EXISTS idx_floqs_visibility
  ON floqs (visibility);

CREATE INDEX IF NOT EXISTS idx_floqs_title_trgm
  ON floqs USING gin (lower(title) gin_trgm_ops);

-- Grant permissions on search function
GRANT EXECUTE ON FUNCTION public.search_floqs(
  double precision, double precision, double precision,
  text, vibe_enum[], timestamptz, timestamptz,
  int, text[], uuid
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_floqs(
  double precision, double precision, double precision,
  text, vibe_enum[], timestamptz, timestamptz,
  int, text[], uuid
) TO anon;