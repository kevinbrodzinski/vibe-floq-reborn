-- Fix venue_details function column name mismatch
-- The function currently references v.geo but the column is actually v.geom

DROP FUNCTION IF EXISTS public.venue_details(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.venue_details(p_venue_id uuid)
RETURNS TABLE (
  id              uuid,
  name            text,
  vibe            text,
  description     text,
  live_count      integer,
  vibe_score      numeric,
  popularity      integer,
  lat             numeric,
  lng             numeric,
  geom            geometry(Point, 4326)
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    v.id,
    v.name,
    v.vibe,
    v.description,
    COALESCE(v.live_count, 0) as live_count,
    COALESCE(v.vibe_score, 50.0) as vibe_score,
    COALESCE(v.popularity, 0) as popularity,
    ST_Y(v.geom::geometry) as lat,
    ST_X(v.geom::geometry) as lng,
    v.geom                            -- FIXED: was v.geo
  FROM venues v
  WHERE v.id = p_venue_id;
$$;

GRANT EXECUTE ON FUNCTION public.venue_details(uuid) TO authenticated;