BEGIN;

-- ============================================================
-- A) Minimal audit: group_receipts (append-only, RLS-on)
--    Stores decision receipts from evaluate-triggers / lock
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_receipts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  profile_id    uuid NULL  REFERENCES public.profiles(id)     ON DELETE SET NULL, -- actor (creator or participant)
  event_type    text NOT NULL CHECK (
                  event_type IN (
                    'SNAPSHOT',
                    'GROUP_SIMULATE',
                    'GROUP_COMMIT',
                    'GROUP_LOCK',
                    'RELAX_APPLIED',
                    'RADIUS_EXPANDED',
                    'SWITCH_SUGGESTED',
                    'SWITCH_ACCEPTED',
                    'SWITCH_REJECTED'
                  )
                ),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {omega_G, P_G, crowd, rainProb, nextPath, reasons[], policy_version, ...}
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_receipts_plan_ts
  ON public.group_receipts (plan_id, created_at DESC);

ALTER TABLE public.group_receipts ENABLE ROW LEVEL SECURITY;

-- Participants (incl. creator) can SELECT receipts for their plan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_receipts' AND polname='gr_select_participants'
  ) THEN
    CREATE POLICY gr_select_participants
      ON public.group_receipts
      FOR SELECT
      USING (
        plan_id IN (
          SELECT pp.plan_id FROM public.plan_participants pp WHERE pp.profile_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.floq_plans p WHERE p.id = group_receipts.plan_id AND p.creator_id = auth.uid())
      );
  END IF;

  -- Insert allowed for participants/creator only; no UPDATE/DELETE policies (append-only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_receipts' AND polname='gr_insert_participants'
  ) THEN
    CREATE POLICY gr_insert_participants
      ON public.group_receipts
      FOR INSERT
      WITH CHECK (
        plan_id IN (
          SELECT pp.plan_id FROM public.plan_participants pp WHERE pp.profile_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.floq_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid())
      );
  END IF;
END$$;

-- ============================================================
-- B) In-DB candidate ranker: fn_ai_suggest_venues(...)
--    Moves scoring out of JS into SQL (PostGIS + trends + price)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_ai_suggest_venues(
  p_lat           double precision,
  p_lng           double precision,
  p_radius_m      integer        DEFAULT 2000,
  p_max_price_tier text          DEFAULT '$$$',
  p_categories    text[]         DEFAULT NULL,
  p_group_size    integer        DEFAULT 4,
  p_when          timestamptz    DEFAULT now(),
  p_limit         integer        DEFAULT 24
)
RETURNS TABLE (
  id          uuid,
  name        text,
  photo_url   text,
  lat         double precision,
  lng         double precision,
  vibe_score  numeric,
  price_level integer,
  trend_score numeric,
  dist_m      integer,
  score       numeric,
  reasons     text[]
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  WITH params AS (
    SELECT
      p_lat  AS lat,
      p_lng  AS lng,
      p_radius_m AS radius_m,
      CASE p_max_price_tier
        WHEN '$' THEN 1
        WHEN '$$' THEN 2
        WHEN '$$$' THEN 3
        WHEN '$$$$' THEN 4
        ELSE 3
      END AS max_price,
      p_categories AS categories,
      p_group_size AS group_size,
      p_when AS ts,
      EXTRACT(DOW  FROM p_when AT TIME ZONE 'UTC')::int AS dow_utc,
      (p_when AT TIME ZONE 'UTC')::time                   AS tm_utc,
      p_limit AS lim
  ),
  base AS (
    SELECT
      v.id, v.name, v.photo_url, v.lat, v.lng, v.vibe_score, v.price_level,
      COALESCE(tv.trend_score::numeric, v.popularity::numeric, 0) AS trend_score,
      ST_DistanceSphere(
        v.location,
        ST_SetSRID(ST_MakePoint((SELECT lng FROM params), (SELECT lat FROM params)), 4326)::geography
      )::int AS dist_m,
      -- category match flag
      CASE
        WHEN (SELECT categories FROM params) IS NULL OR array_length((SELECT categories FROM params),1) IS NULL
          THEN true
        ELSE v.categories && (SELECT categories FROM params)
      END AS category_ok,
      -- within radius
      ST_DWithin(
        v.location,
        ST_SetSRID(ST_MakePoint((SELECT lng FROM params), (SELECT lat FROM params)), 4326)::geography,
        (SELECT radius_m FROM params)
      ) AS in_radius,
      -- open-now check (UTC-based; handles overnight)
      EXISTS (
        SELECT 1
        FROM public.venue_hours h
        WHERE h.venue_id = v.id
          AND h.dow = (SELECT dow_utc FROM params)
          AND (
            (h.open <= h.close AND (SELECT tm_utc FROM params) >= h.open AND (SELECT tm_utc FROM params) < h.close)
            OR
            (h.open >  h.close AND ((SELECT tm_utc FROM params) >= h.open OR (SELECT tm_utc FROM params) < h.close))
          )
      ) AS is_open
    FROM public.venues v
    LEFT JOIN public.v_trending_venues_enriched tv
      ON tv.venue_id = v.id
    WHERE v.location IS NOT NULL
      AND (v.price_level IS NULL OR v.price_level <= (SELECT max_price FROM params))
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE in_radius AND category_ok
  ),
  scored AS (
    SELECT
      id, name, photo_url, lat, lng, vibe_score, price_level, trend_score, dist_m,
      -- Normalize features
      LEAST(1.0, dist_m::numeric / NULLIF((SELECT radius_m FROM params),0))                       AS dist_norm,
      LEAST(1.0, GREATEST(0, trend_score) / 100.0)                                                AS trend_norm,
      GREATEST(0.0, COALESCE(price_level,2) - (SELECT max_price FROM params)) * 0.6               AS price_penalty,
      -- Score: distance (45%), trend (35%), price fit (20% inverse)
      (0.45*(1 - LEAST(1.0, dist_m::numeric / NULLIF((SELECT radius_m FROM params),0)))
       + 0.35*LEAST(1.0, GREATEST(0, trend_score) / 100.0)
       + 0.20*(1 - GREATEST(0.0, COALESCE(price_level,2) - (SELECT max_price FROM params)) * 0.6)
      )::numeric AS score,
      is_open
    FROM filtered
  )
  SELECT
    id, name, photo_url, lat, lng, vibe_score, price_level, trend_score, dist_m, score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN trend_score >= 70 THEN 'Hot right now' END,
      CASE WHEN dist_m <= 600    THEN 'Nearby' END,
      CASE WHEN is_open          THEN 'Open now' END,
      CASE WHEN price_level IS NULL OR price_level <= (SELECT max_price FROM params) THEN 'Fits budget' END
    ]::text[], NULL) AS reasons
  FROM scored
  ORDER BY score DESC, dist_m ASC NULLS LAST
  LIMIT (SELECT lim FROM params);
$$;

COMMIT;