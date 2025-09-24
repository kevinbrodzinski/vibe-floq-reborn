-- ===============================================
-- Day 1 Density Map Foundation Migration (POLISHED)
-- Materialized view + privacy-safe vibe clustering
-- PostgreSQL 14+ compatible, production-ready
-- ===============================================

-- 1️⃣ EXTENSIONS (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2️⃣ CLUSTER PRECISION HELPER
CREATE OR REPLACE FUNCTION public.cluster_precision(requested_precision integer DEFAULT 6)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(4, LEAST(requested_precision, 8));
$$;

-- 3️⃣ REFRESH METRICS TABLE (with data integrity)
CREATE TABLE IF NOT EXISTS public.refresh_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name text NOT NULL,
  started_at timestamptz NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_metrics_view_started 
  ON public.refresh_metrics (view_name, started_at DESC);

-- 4️⃣ MATERIALIZED VIEW (PG 14+ compatible, low memory)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.vibe_clusters AS
WITH live AS (
  SELECT
    ST_GeoHash(location::geometry, cluster_precision()) AS gh6,
    vibe_tag,
    location::geometry AS geom
  FROM public.user_vibe_states
  WHERE active = TRUE
    AND started_at > (now() - interval '90 minutes')
    AND location IS NOT NULL
),
vibe_counts_ordered AS (
  SELECT 
    gh6, 
    vibe_tag, 
    COUNT(*) as cnt,
    geom
  FROM live
  GROUP BY gh6, vibe_tag, geom
  ORDER BY gh6, vibe_tag
),
agg AS (
  SELECT
    gh6,
    ST_PointOnSurface(ST_Collect(geom)) AS centroid,
    COUNT(*) AS total,
    jsonb_object_agg(vibe_tag, cnt) AS vibe_counts
  FROM vibe_counts_ordered
  GROUP BY gh6
  HAVING COUNT(*) >= 3
)
SELECT
  gh6,
  centroid,
  total,
  vibe_counts,
  now() AS last_updated
FROM agg
WITH NO DATA;

-- 5️⃣ INDEXES (inside transaction, no CONCURRENTLY needed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vibe_clusters_gh6 ON vibe_clusters (gh6);
CREATE INDEX IF NOT EXISTS idx_vibe_clusters_centroid ON vibe_clusters USING gist (centroid);
CREATE INDEX IF NOT EXISTS idx_vibe_clusters_total ON vibe_clusters (total DESC);

-- Performance indexes for dynamic queries and TTL
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_location
  ON public.user_vibe_states USING gist(location);
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_expirable
  ON public.user_vibe_states (started_at) 
  WHERE active = TRUE;

-- 6️⃣ FIRST REFRESH (one-time guard, can't use CONCURRENTLY on empty view)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'vibe_clusters' AND ispopulated = true) THEN
    REFRESH MATERIALIZED VIEW vibe_clusters;
  END IF;
END $$;

-- 7️⃣ PERMISSIONS (direct grants, simpler than RLS)
GRANT SELECT ON public.vibe_clusters TO authenticated, anon;
GRANT SELECT ON public.refresh_metrics TO authenticated, anon;

-- 8️⃣ QUERY API FUNCTION (optimized, PG 14+ compatible)
CREATE OR REPLACE FUNCTION public.get_vibe_clusters(
  min_lng double precision,
  min_lat double precision, 
  max_lng double precision,
  max_lat double precision,
  p_precision integer DEFAULT 6
)
RETURNS TABLE (
  gh6 text,
  centroid geometry,
  total bigint,
  vibe_counts jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
COST 10
PARALLEL SAFE
SET search_path = public
SET row_security = off
AS $$
DECLARE
  effective_precision integer := cluster_precision(p_precision);
  bbox geometry := ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
BEGIN
  IF effective_precision = 6 THEN
    -- Fast path: use materialized view
    RETURN QUERY
    SELECT vc.gh6, vc.centroid, vc.total, vc.vibe_counts
    FROM public.vibe_clusters vc
    WHERE vc.centroid && bbox
    ORDER BY vc.total DESC
    LIMIT 1000;
  ELSE
    -- Dynamic path: aggregate on-the-fly at requested precision (PG 14+ compatible)
    RETURN QUERY
    WITH live_filtered AS (
      SELECT 
        ST_GeoHash(uvs.location::geometry, effective_precision) as gh6,
        uvs.vibe_tag,
        uvs.location::geometry as geom
      FROM public.user_vibe_states uvs
      WHERE uvs.active = TRUE 
        AND uvs.started_at > (now() - interval '90 minutes')
        AND uvs.location IS NOT NULL
        AND uvs.location::geometry && bbox
    ),
    vibe_counts_ordered AS (
      SELECT 
        gh6, 
        vibe_tag, 
        COUNT(*) as cnt,
        geom
      FROM live_filtered
      GROUP BY gh6, vibe_tag, geom
      ORDER BY gh6, vibe_tag
    )
    SELECT 
      vco.gh6,
      ST_PointOnSurface(ST_Collect(vco.geom)) as centroid,
      COUNT(*)::bigint as total,
      jsonb_object_agg(vco.vibe_tag, vco.cnt) as vibe_counts
    FROM vibe_counts_ordered vco
    GROUP BY vco.gh6
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
    LIMIT 1000;
  END IF;
END;
$$;

-- 9️⃣ CRON REFRESH FUNCTION
CREATE OR REPLACE FUNCTION public.refresh_vibe_clusters_with_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time timestamptz := clock_timestamp();
  metric_id uuid;
  refresh_success boolean := false;
BEGIN
  -- Insert start record
  INSERT INTO refresh_metrics(view_name, started_at, duration_ms)
  VALUES ('vibe_clusters', start_time, 0)
  RETURNING id INTO metric_id;
  
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY vibe_clusters;
  refresh_success := true;
  
  -- Update with actual duration only if successful
  UPDATE refresh_metrics
  SET duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
  WHERE id = metric_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Only update duration if we successfully inserted the metric record
  IF metric_id IS NOT NULL AND NOT refresh_success THEN
    UPDATE refresh_metrics
    SET duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    WHERE id = metric_id;
  END IF;
  PERFORM pg_notify('cluster_refresh_error', SQLERRM);
END;
$$;

-- 🔟 CRON JOBS
-- Refresh materialized view every minute with metrics tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'refresh_vibe_clusters_with_metrics'
  ) THEN
    PERFORM cron.schedule(
      'refresh_vibe_clusters_with_metrics',
      '* * * * *',
      'SELECT public.refresh_vibe_clusters_with_metrics();'
    );
  END IF;
END $$;

-- Clean up old metrics (weekly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'cleanup_refresh_metrics'
  ) THEN
    PERFORM cron.schedule(
      'cleanup_refresh_metrics',
      '0 2 * * 0',
      'DELETE FROM public.refresh_metrics WHERE started_at < (now() - interval ''7 days'');'
    );
  END IF;
END $$;

-- TTL cleanup for vibe states (existing job, keep as-is but add search_path)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'floq_expire_stale_vibes'
  ) THEN
    PERFORM cron.schedule(
      'floq_expire_stale_vibes',
      '*/10 * * * *',
      'UPDATE public.user_vibe_states SET active = FALSE WHERE active = TRUE AND started_at < (now() - interval ''90 minutes'');'
    );
  END IF;
END $$;