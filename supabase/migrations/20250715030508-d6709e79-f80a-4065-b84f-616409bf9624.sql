-- Advanced Search Infrastructure for Phase A-2
-- Migration: Advanced Search & Filters

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create optimized indexes for search_floqs function
CREATE INDEX IF NOT EXISTS idx_floqs_location_gist
  ON public.floqs USING gist (location);

CREATE INDEX IF NOT EXISTS idx_floqs_title_trgm
  ON public.floqs USING gin (lower(title) gin_trgm_ops);

-- Filtered index for visibility and soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_floqs_visibility_deleted
  ON public.floqs (visibility, deleted_at)
  WHERE deleted_at IS NULL;

-- Composite index for vibe and time range queries
CREATE INDEX IF NOT EXISTS idx_floqs_vibe_time
  ON public.floqs (primary_vibe, starts_at);

-- Advanced search function with optimized performance
CREATE OR REPLACE FUNCTION public.search_floqs(
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_radius_km  DOUBLE PRECISION DEFAULT 25,
  p_query      TEXT DEFAULT '',
  p_vibe_ids   vibe_enum[] DEFAULT '{}',
  p_time_from  TIMESTAMPTZ DEFAULT now(),
  p_time_to    TIMESTAMPTZ DEFAULT now() + interval '7 days',
  p_limit      INT DEFAULT 100
)
RETURNS TABLE (
  id           uuid,
  title        text,
  primary_vibe vibe_enum,
  starts_at    timestamptz,
  ends_at      timestamptz,
  distance_m   double precision,
  participant_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set similarity threshold for better fuzzy matching on short queries
  PERFORM set_config('pg_trgm.similarity_threshold', '0.15', true);
  
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.primary_vibe,
    f.starts_at,
    f.ends_at,
    ST_DistanceSphere(f.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)) AS distance_m,
    COALESCE(pc.participant_count, 0) AS participant_count
  FROM public.floqs f
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = f.id
  ) pc ON TRUE
  WHERE f.deleted_at IS NULL
    AND f.visibility = 'public'
    -- Spatial filter using geography for performance
    AND ST_DWithin(
          f.location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_km * 1000
        )
    -- Fuzzy text search using trigram operator
    AND (p_query = '' OR lower(f.title) % lower(p_query))
    -- Vibe filter with array support
    AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
    -- Time overlap with optimized coalesce evaluation
    AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
    AND f.starts_at <= p_time_to
  ORDER BY distance_m
  LIMIT p_limit;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.search_floqs TO authenticated;