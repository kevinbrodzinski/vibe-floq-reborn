BEGIN;

-- ============================================================
-- A) Minimal audit: group_receipts (append-only, RLS-on)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_receipts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  profile_id  uuid NULL  REFERENCES public.profiles(id)     ON DELETE SET NULL,
  event_type  text NOT NULL CHECK (
                event_type IN (
                  'SNAPSHOT','GROUP_SIMULATE','GROUP_COMMIT','GROUP_LOCK',
                  'RELAX_APPLIED','RADIUS_EXPANDED',
                  'SWITCH_SUGGESTED','SWITCH_ACCEPTED','SWITCH_REJECTED'
                )
              ),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_receipts_plan_ts
  ON public.group_receipts (plan_id, created_at DESC);

ALTER TABLE public.group_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_receipts' AND policyname = 'gr_select_participants'
  ) THEN
    CREATE POLICY gr_select_participants
      ON public.group_receipts
      FOR SELECT
      USING (
        plan_id IN (SELECT pp.plan_id FROM public.plan_participants pp WHERE pp.profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.floq_plans p WHERE p.id = group_receipts.plan_id AND p.creator_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_receipts' AND policyname = 'gr_insert_participants'
  ) THEN
    CREATE POLICY gr_insert_participants
      ON public.group_receipts
      FOR INSERT
      WITH CHECK (
        plan_id IN (SELECT pp.plan_id FROM public.plan_participants pp WHERE pp.profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.floq_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid())
      );
  END IF;
END$$;

-- ============================================================
-- B) In-DB candidate ranker (no PostGIS): fn_ai_suggest_venues
--    Inputs use numeric price level (1..4), NOT "$" strings
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_ai_suggest_venues(
  p_lat               double precision,
  p_lng               double precision,
  p_radius_m          integer        DEFAULT 2000,
  p_max_price_level   integer        DEFAULT 3,     -- 1..4
  p_categories        text[]         DEFAULT NULL,
  p_group_size        integer        DEFAULT 4,
  p_when              timestamptz    DEFAULT now(),
  p_limit             integer        DEFAULT 24
)
RETURNS TABLE (
  id           uuid,
  name         text,
  photo_url    text,
  lat          double precision,
  lng          double precision,
  vibe_score   numeric,
  price_level  integer,
  trend_score  numeric,
  dist_m       integer,
  score        numeric,
  reasons      text[]
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $fn$
  WITH params AS (
    SELECT
      p_lat   AS lat,
      p_lng   AS lng,
      GREATEST(100, LEAST(5000, p_radius_m)) AS radius_m,
      LEAST(4, GREATEST(1, p_max_price_level)) AS max_price,
      NULLIF(p_categories, ARRAY[]::text[]) AS categories,
      LEAST(200, GREATEST(1, p_limit)) AS lim,
      EXTRACT(DOW  FROM p_when AT TIME ZONE 'UTC')::int AS dow_utc,
      (p_when AT TIME ZONE 'UTC')::time                   AS tm_utc
  ),
  bbox AS (
    SELECT
      lat,
      lng,
      radius_m,
      (radius_m / 111000.0)::double precision            AS d_lat,
      (radius_m / (111000.0 * COS(radians(lat))))::double precision AS d_lng
    FROM params
  ),
  pool AS (
    SELECT
      v.id, v.name, v.photo_url, v.lat, v.lng,
      v.vibe_score, v.price_level,
      COALESCE(tv.trend_score::numeric, v.popularity::numeric, 0) AS trend_score,
      v.categories
    FROM public.venues v
    LEFT JOIN public.v_trending_venues_enriched tv
      ON tv.venue_id = v.id
    WHERE v.lat BETWEEN ((SELECT lat - d_lat FROM bbox)) AND ((SELECT lat + d_lat FROM bbox))
      AND v.lng BETWEEN ((SELECT lng - d_lng FROM bbox)) AND ((SELECT lng + d_lng FROM bbox))
      AND (v.price_level IS NULL OR v.price_level <= (SELECT max_price FROM params))
      AND ( (SELECT categories FROM params) IS NULL OR v.categories && (SELECT categories FROM params) )
  ),
  dist_scored AS (
    SELECT
      p.*,
      -- Haversine distance in meters (pure SQL; no PostGIS)
      (2 * 6371000.0 * asin( sqrt(
         power( sin( radians(p.lat - (SELECT lat FROM params)) / 2 ), 2 ) +
         cos( radians((SELECT lat FROM params)) ) *
         cos( radians(p.lat) ) *
         power( sin( radians(p.lng - (SELECT lng FROM params)) / 2 ), 2 )
      )) )::int AS dist_m
    FROM pool p
  ),
  filtered AS (
    SELECT * FROM dist_scored
    WHERE dist_m <= (SELECT radius_m FROM params)
  ),
  scored AS (
    SELECT
      f.*,
      LEAST(1.0, GREATEST(0, dist_m::numeric / (SELECT radius_m FROM params))) AS dist_norm,
      LEAST(1.0, GREATEST(0, trend_score) / 100.0)                             AS trend_norm,
      GREATEST(0.0, COALESCE(price_level,2) - (SELECT max_price FROM params)) * 0.6 AS price_penalty,
      (
        0.45 * (1 - LEAST(1.0, GREATEST(0, dist_m::numeric / (SELECT radius_m FROM params))))
        + 0.35 * LEAST(1.0, GREATEST(0, trend_score) / 100.0)
        + 0.20 * (1 - GREATEST(0.0, COALESCE(price_level,2) - (SELECT max_price FROM params)) * 0.6)
      )::numeric AS score
    FROM filtered f
  )
  SELECT
    id, name, photo_url, lat, lng, vibe_score, price_level, trend_score, dist_m, score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN trend_score >= 70 THEN 'Hot right now' END,
      CASE WHEN dist_m <= 600    THEN 'Nearby' END,
      CASE WHEN price_level IS NULL OR price_level <= (SELECT max_price FROM params) THEN 'Fits budget' END
    ]::text[], NULL) AS reasons
  FROM scored
  ORDER BY score DESC, dist_m ASC NULLS LAST
  LIMIT (SELECT lim FROM params);
$fn$;

COMMIT;