BEGIN;
SET search_path = public;

-- Clean old overload (4-arg)
DROP FUNCTION IF EXISTS public.get_trending_venues_enriched(double precision,double precision,integer,integer);

-- Canonical 6-arg version: (lat,lng,radius_m, limit, any_tags, all_tags)
CREATE OR REPLACE FUNCTION public.get_trending_venues_enriched(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   integer,
  p_limit      integer,
  p_any_tags   text[] DEFAULT NULL,
  p_all_tags   text[] DEFAULT NULL
)
RETURNS TABLE (
  venue_id        uuid,
  name            text,
  distance_m      numeric,
  people_now      bigint,
  visits_15m      bigint,
  trend_score     bigint,
  last_seen_at    timestamptz,
  provider        text,
  categories      text[],
  vibe_tag        text,
  vibe_score      numeric,
  live_count      integer,
  photo_url       text,
  canonical_tags  text[]
)
LANGUAGE sql STABLE AS $$
  WITH origin AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g
  ),
  wish AS (
    SELECT
      public.pill_keys_to_canonical_tags(p_any_tags) AS any_wanted,
      public.pill_keys_to_canonical_tags(p_all_tags) AS all_wanted
  ),
  base AS (
    SELECT
      e.venue_id, v.name,
      ST_Distance(v.location, o.g) AS distance_m,
      e.people_now, e.visits_15m, e.trend_score, e.last_seen_at,
      e.provider, e.categories, e.vibe_tag, e.vibe_score, e.live_count, e.photo_url,
      COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) AS tags_enum
    FROM public.v_trending_venues_enriched e
    JOIN public.venues v ON v.id = e.venue_id
    CROSS JOIN origin o
    WHERE v.location IS NOT NULL
      AND ST_DWithin(v.location, o.g, p_radius_m)
  )
  SELECT
    b.venue_id, b.name, b.distance_m, b.people_now, b.visits_15m, b.trend_score, b.last_seen_at,
    b.provider, b.categories, b.vibe_tag, b.vibe_score, b.live_count, b.photo_url,
    (b.tags_enum)::text[] AS canonical_tags
  FROM base b, wish w
  WHERE (p_any_tags IS NULL OR array_length(w.any_wanted,1) IS NULL OR b.tags_enum && w.any_wanted)
    AND (p_all_tags IS NULL OR array_length(w.all_wanted,1) IS NULL OR b.tags_enum @> w.all_wanted)
  ORDER BY b.trend_score DESC NULLS LAST, b.people_now DESC NULLS LAST
  LIMIT GREATEST(p_limit,1);
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_venues_enriched(double precision,double precision,integer,integer,text[],text[]) TO authenticated;

COMMIT;