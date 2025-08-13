BEGIN;
SET search_path = public;

-- Clean old overloads to avoid "not unique"
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer);
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer,integer);
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer,text[]);
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer,integer,text[],text[]);

-- Canonical 5-arg version: (lat,lng,radius_m, any_tags, all_tags)
CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_m  integer,
  p_any_tags  text[] DEFAULT NULL,
  p_all_tags  text[] DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  name            text,
  distance_m      numeric,
  lat             numeric,
  lng             numeric,
  categories      text[],
  provider        text,
  photo_url       text,
  vibe_tag        text,
  vibe_score      numeric,
  live_count      integer,
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
  )
  SELECT
    v.id, v.name,
    ST_Distance(v.location, o.g) AS distance_m,
    v.lat::numeric, v.lng::numeric,
    v.categories, v.provider, v.photo_url,
    v.vibe AS vibe_tag, v.vibe_score, v.live_count,
    (COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)))::text[] AS canonical_tags
  FROM public.venues v
  CROSS JOIN origin o
  CROSS JOIN wish w
  WHERE v.location IS NOT NULL
    AND ST_DWithin(v.location, o.g, p_radius_m)
    AND (p_any_tags IS NULL OR array_length(w.any_wanted,1) IS NULL OR (COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) && w.any_wanted))
    AND (p_all_tags IS NULL OR array_length(w.all_wanted,1) IS NULL OR (COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) @> w.all_wanted))
  ORDER BY distance_m ASC, v.popularity DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_venues(double precision,double precision,integer,text[],text[]) TO authenticated;

COMMIT;