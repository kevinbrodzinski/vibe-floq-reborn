BEGIN;
SET search_path = public;

-- 1. canonical_tag enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canonical_tag') THEN
    CREATE TYPE public.canonical_tag AS ENUM (
      'outdoor','patio','rooftop','waterfront','park','beach',
      'cozy','lounge','speakeasy','board_games','cinema','arcade','bowling',
      'live_music','music_venue','dance_club','night_club','karaoke',
      'sports_bar','bar','pub','brewery','winery',
      'cafe','coffee','brunch','bakery','restaurant',
      'games','communal_seating','group_friendly',
      'date_spot','open_air_event'
    );
  END IF;
END$$;

-- 2. provider → canonical mapping table (used by canonicalization)
CREATE TABLE IF NOT EXISTS public.venue_category_map (
  provider   text NOT NULL,
  raw        text NOT NULL,
  canonical  public.canonical_tag NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_category_map_pkey PRIMARY KEY (provider, raw, canonical)
);
CREATE INDEX IF NOT EXISTS idx_vcm_provider_raw
  ON public.venue_category_map (lower(provider), lower(raw));

-- Seed (safe to re-run)
INSERT INTO public.venue_category_map (provider, raw, canonical) VALUES
  -- Google
  ('google','restaurant','restaurant'),
  ('google','bar','bar'),
  ('google','night_club','night_club'),
  ('google','cafe','cafe'),
  ('google','bakery','bakery'),
  ('google','movie_theater','cinema'),
  ('google','bowling_alley','bowling'),
  ('google','park','park'),
  ('google','rooftop','rooftop'),
  ('google','patio','patio'),
  -- Foursquare
  ('foursquare','Bar','bar'),
  ('foursquare','Pub','pub'),
  ('foursquare','Brewery','brewery'),
  ('foursquare','Wine Bar','winery'),
  ('foursquare','Night Club','night_club'),
  ('foursquare','Music Venue','music_venue'),
  ('foursquare','Karaoke Bar','karaoke'),
  ('foursquare','Coffee Shop','coffee'),
  ('foursquare','Breakfast Spot','brunch'),
  ('foursquare','Arcade','arcade'),
  ('foursquare','Bowling Alley','bowling'),
  ('foursquare','Sports Bar','sports_bar'),
  ('foursquare','Park','park'),
  ('foursquare','Beach','beach'),
  ('foursquare','Lounge','lounge'),
  ('foursquare','Speakeasy','speakeasy')
ON CONFLICT DO NOTHING;

-- 3. helper: canonicalize raw categories → text[]
CREATE OR REPLACE FUNCTION public.canonicalize_categories(p_provider text, p_raw text[])
RETURNS text[]
LANGUAGE sql STABLE AS $$
  WITH src AS (
    SELECT lower(coalesce(p_provider,'')) AS provider,
           coalesce(p_raw, ARRAY[]::text[]) AS arr
  ),
  expanded AS (
    SELECT s.provider, lower(x) AS raw FROM src s, unnest(s.arr) AS u(x)
  ),
  mapped AS (
    SELECT DISTINCT m.canonical::text
    FROM expanded e
    LEFT JOIN public.venue_category_map m
      ON lower(m.provider) = e.provider AND lower(m.raw) = e.raw
    WHERE m.canonical IS NOT NULL
  )
  SELECT COALESCE(array_agg(DISTINCT canonical), ARRAY[]::text[]) FROM mapped;
$$;

-- 4. main canonicalization (enum[]) with simple name heuristics
CREATE OR REPLACE FUNCTION public.canonicalize_venue_enum(p_provider text, p_raw text[], p_name text)
RETURNS public.canonical_tag[]
LANGUAGE plpgsql STABLE AS $$
DECLARE
  tags    text[] := canonicalize_categories(p_provider, p_raw);
  n       text   := coalesce(lower(p_name),'');
  out_tags public.canonical_tag[];
BEGIN
  IF n ~* '\brooftop\b' OR n ~* '\bpatio\b' THEN
    tags := tags || ARRAY['rooftop','patio','outdoor'];
  END IF;
  IF n ~* '\bbrunch\b' THEN
    tags := tags || ARRAY['brunch'];
  END IF;
  IF n ~* '\b(live|band|concert|jazz)\b' THEN
    tags := tags || ARRAY['live_music','music_venue'];
  END IF;
  IF n ~* '\b(arcade|bowling|billiards|pinball|game)\b' THEN
    tags := tags || ARRAY['games'];
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT x::public.canonical_tag
    FROM unnest(tags) t(x)
    WHERE x IS NOT NULL
  ) INTO out_tags;

  RETURN COALESCE(out_tags, ARRAY[]::public.canonical_tag[]);
END;
$$;

-- 5. pill keys → canonical_tag[] (fixed FROM clause, dedup)
CREATE OR REPLACE FUNCTION public.pill_keys_to_canonical_tags(p_keys text[])
RETURNS public.canonical_tag[]
LANGUAGE sql IMMUTABLE AS $$
  WITH k AS (
    SELECT lower(coalesce(x,'')) AS k
    FROM unnest(COALESCE(p_keys, ARRAY[]::text[])) AS u(x)
  ),
  mapped AS (
    SELECT unnest(
      CASE
        WHEN k.k IN ('outdoor_dining','outdoor_venues') THEN ARRAY['outdoor','patio']::public.canonical_tag[]
        WHEN k.k IN ('rooftop_bars','rooftop')          THEN ARRAY['rooftop']::public.canonical_tag[]
        WHEN k.k IN ('bars_clubs','bars & clubs')       THEN ARRAY['bar','night_club','dance_club']::public.canonical_tag[]
        WHEN k.k =  'live_music'                         THEN ARRAY['live_music','music_venue']::public.canonical_tag[]
        WHEN k.k IN ('coffee_spots','coffee','cafes')    THEN ARRAY['coffee','cafe']::public.canonical_tag[]
        WHEN k.k =  'group-friendly'                     THEN ARRAY['group_friendly']::public.canonical_tag[]
        WHEN k.k =  'communal_seating'                   THEN ARRAY['communal_seating']::public.canonical_tag[]
        WHEN k.k =  'games_interactive'                  THEN ARRAY['games','arcade','bowling']::public.canonical_tag[]
        WHEN k.k =  'beach_spots'                        THEN ARRAY['beach']::public.canonical_tag[]
        WHEN k.k =  'open-air events'                    THEN ARRAY['open_air_event']::public.canonical_tag[]
        ELSE ARRAY[]::public.canonical_tag[]
      END
    ) AS tag
    FROM k
  )
  SELECT COALESCE(array_agg(DISTINCT tag), ARRAY[]::public.canonical_tag[]) FROM mapped;
$$;

COMMIT;