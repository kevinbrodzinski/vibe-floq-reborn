-- ═══════════════════════════════════════════════════════════════════════════════
-- Geohash Bucket Filter Optimization
-- Adds geohash5 column to venues and optimizes match_unmatched_pings() for performance
-- Run in SQL editor as supabase_admin - fully idempotent
-- ═══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1️⃣  venues.geohash5  (adds only if missing)
--    5-char hash ≈ 4.8 km bucket
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS geohash5 text
  GENERATED ALWAYS AS (substr(ST_GeoHash(geom, 5), 1, 5)) STORED;

CREATE INDEX IF NOT EXISTS idx_venues_geohash5
  ON public.venues (geohash5);

-- ────────────────────────────────────────────────────────────────
-- 2️⃣  Replace the join in match_unmatched_pings()
--    Now uses geohash bucket filter for massive performance boost

CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _since constant interval := '10 minutes';
  ins int := 0;
BEGIN
  WITH cte AS (
    SELECT
      rl.id,
      rl.user_id,
      rl.captured_at,
      rl.geom,
      v.id        AS venue_id,
      v.radius_m,
      ST_Distance(rl.geom, v.geom)::numeric AS dist,
      row_number() OVER (PARTITION BY rl.id ORDER BY ST_Distance(rl.geom, v.geom)) AS rn
    FROM   public.raw_locations   rl
    JOIN   public.venues          v
      ON   rl.geohash5 = v.geohash5               -- ⚡ bucket filter (NEW!)
     AND   ST_DWithin(rl.geom, v.geom, v.radius_m)
    WHERE  rl.captured_at >= now() - _since
      AND  rl.acc <= 50                          -- Optional: ignore noisy GPS
  )
  INSERT INTO public.venue_visits(user_id, venue_id, arrived_at, distance_m)
  SELECT user_id, venue_id, captured_at, dist
  FROM   cte
  WHERE  rn = 1
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 3️⃣  Performance monitoring query
--     Check backlog after optimization

-- Run this to monitor performance improvement:
-- SELECT now() - min(captured_at) as backlog
-- FROM   raw_locations
-- WHERE  captured_at >= now() - interval '15 minutes';

-- ────────────────────────────────────────────────────────────────
-- Notes:
-- - This adds ~4.8km geohash buckets to dramatically reduce venue join scan
-- - Previous geohash5 column on raw_locations is already in place
-- - GiST index on geom stays for ST_DWithin precision
-- - Fully backward compatible and idempotent