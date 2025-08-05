-- ───────────────────────────────────────────────────────────────
-- v_friend_sparkline  (mat-view) - WITHOUT RLS since it's not supported
-- ───────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_friend_sparkline
AS
WITH latest AS (
  SELECT
    rl.user_id,
    rl.geom,
    rl.captured_at,
    row_number() OVER (
      PARTITION BY rl.user_id
      ORDER BY     rl.captured_at DESC
    ) AS rn
  FROM public.raw_locations rl
  WHERE rl.captured_at >= now() - INTERVAL '24 hours'
)
SELECT
  user_id,
  json_agg(
    json_build_array(
      round(ST_Y(geom::geometry)::numeric, 6),   -- lat
      round(ST_X(geom::geometry)::numeric, 6)    -- lng
    )
    ORDER BY captured_at DESC
  )          AS points
FROM latest
WHERE rn <= 20
GROUP BY user_id;

-- 🔧 index speeds WHERE user_id = $me
CREATE INDEX IF NOT EXISTS idx_mv_friend_sparkline_uid
  ON public.v_friend_sparkline (user_id);

-- add ends_at column once
ALTER TABLE public.friend_share_pref
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- helper: returns true if user currently shares live location
CREATE OR REPLACE FUNCTION public.is_live_now(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(             -- default = FALSE when no row
           ( SELECT CASE
                    WHEN NOT is_live                 THEN FALSE
                    WHEN ends_at IS NULL            THEN TRUE
                    ELSE   now() < ends_at
                  END
             FROM public.friend_share_pref
             WHERE user_id = uid
             LIMIT 1 ),
           FALSE)
$$;

-- ───────────────────────────────────────────────────────────────
-- v_encounter_heat  (security-definer view)
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_encounter_heat
WITH (security_barrier = true)        -- prevent bypass
AS
SELECT
  ue.venue_id,
  COUNT(*)                         AS hits,
  MAX(ue.first_seen)               AS last_seen,
  v.geom
FROM public.user_encounter ue
JOIN public.venues        v  ON v.id = ue.venue_id
WHERE (ue.user_a = auth.uid() OR ue.user_b = auth.uid())
GROUP BY ue.venue_id, v.geom;