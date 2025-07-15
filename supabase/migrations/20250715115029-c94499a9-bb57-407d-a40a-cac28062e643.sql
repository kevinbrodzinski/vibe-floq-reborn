/* ================================================================
   Track B – Hot-Spot Halos
   Schema + jobs (v1, July 2025)
   ================================================================ */

/* 1️⃣  —————————————————  History table  ——————————————————— */
CREATE TABLE IF NOT EXISTS public.vibe_clusters_history (
  gh6         text        NOT NULL,
  total       int         NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gh6, snapshot_at)
);

-- Fast look-ups for "latest ≤ N min" queries
CREATE INDEX IF NOT EXISTS vibe_clusters_history_gh6_ts_idx
  ON public.vibe_clusters_history (gh6, snapshot_at DESC);

/* 2️⃣  —————————————————  Momentum MV  ———————————————————— */
/* NB: the base MV `vibe_clusters` must already exist and have
       a UNIQUE index on gh6 so we can refresh CONCURRENTLY. */

DROP MATERIALIZED VIEW IF EXISTS public.vibe_cluster_momentum;
CREATE MATERIALIZED VIEW public.vibe_cluster_momentum AS
SELECT
  vc.gh6,
  vc.centroid,
  vc.total                 AS total_now,
  vc.dom_vibe,
  vc.dom_count,
  COALESCE(vc.total - h5.total , 0)  AS delta_5m,
  COALESCE(vc.total - h15.total, 0)  AS delta_15m
FROM  public.vibe_clusters vc
LEFT  JOIN LATERAL (
        SELECT total
        FROM   public.vibe_clusters_history
        WHERE  gh6 = vc.gh6
          AND  snapshot_at > now() - interval '5 min'
        ORDER  BY snapshot_at ASC
        LIMIT  1) h5 ON TRUE
LEFT  JOIN LATERAL (
        SELECT total
        FROM   public.vibe_clusters_history
        WHERE  gh6 = vc.gh6
          AND  snapshot_at > now() - interval '15 min'
        ORDER  BY snapshot_at ASC
        LIMIT  1) h15 ON TRUE
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS vibe_cluster_momentum_pk
  ON public.vibe_cluster_momentum(gh6);

CREATE INDEX IF NOT EXISTS vibe_cluster_momentum_centroid_gix
  ON public.vibe_cluster_momentum
  USING GIST(centroid);

/* 3️⃣  ———————————  Refresh + snapshot helper  —————————— */
CREATE OR REPLACE FUNCTION public.refresh_vibe_cluster_momentum()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '2s'
AS $$
BEGIN
  -- ❶ Refresh the source MV
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vibe_clusters;

  -- ❷ Snapshot current state
  INSERT INTO public.vibe_clusters_history (gh6, total, snapshot_at)
  SELECT gh6, total, now()
  FROM   public.vibe_clusters
  ON CONFLICT DO NOTHING;

  -- ❸ Refresh momentum
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vibe_cluster_momentum;
END;
$$;

/* 4️⃣  ————————————————  Hot-spot broadcaster  ————————————— */
CREATE OR REPLACE FUNCTION public.publish_hotspots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  SELECT jsonb_agg(
           jsonb_build_object(
             'gh6',      gh6,
             'dom_vibe', dom_vibe,
             'delta',    delta_5m,
             'centroid', ST_AsGeoJSON(centroid)::jsonb,
             'user_cnt', dom_count
           )
         )
  INTO   payload
  FROM   public.vibe_cluster_momentum
  WHERE  delta_5m >= 3;          -- threshold for "surging"

  IF payload IS NOT NULL THEN
    PERFORM pg_notify('hotspots_updated', payload::text);
  END IF;
END;
$$;

/* 5️⃣  ——————————  Metrics-wrapping master job  ——————————— */
-- Optional table for timing metrics
CREATE TABLE IF NOT EXISTS public.refresh_metrics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name   text        NOT NULL,
  started_at  timestamptz NOT NULL,
  duration_ms int
);

CREATE OR REPLACE FUNCTION public.refresh_vibe_clusters_with_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '2s'
AS $$
DECLARE
  start_ts  timestamptz := clock_timestamp();
  metric_id uuid;
BEGIN
  INSERT INTO refresh_metrics(view_name, started_at, duration_ms)
  VALUES ('vibe_clusters', start_ts, 0)
  RETURNING id INTO metric_id;

  -- Do the heavy lifting
  PERFORM public.refresh_vibe_cluster_momentum();
  PERFORM public.publish_hotspots();

  UPDATE refresh_metrics
  SET duration_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - start_ts))
  WHERE id = metric_id;
EXCEPTION WHEN OTHERS THEN
  IF metric_id IS NOT NULL THEN
    UPDATE refresh_metrics
    SET duration_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - start_ts))
    WHERE id = metric_id;
  END IF;
  PERFORM pg_notify('cluster_refresh_error', SQLERRM);
  RAISE;  -- re-throw so cron sees failure
END;
$$;

/* 6️⃣  ————————————————  Grants & ownership  ————————————— */
ALTER FUNCTION public.refresh_vibe_cluster_momentum()      OWNER TO postgres;
ALTER FUNCTION public.publish_hotspots()                   OWNER TO postgres;
ALTER FUNCTION public.refresh_vibe_clusters_with_metrics() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.refresh_vibe_cluster_momentum()      TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_hotspots()                   TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_vibe_clusters_with_metrics() TO service_role;

/* 7️⃣  ————————————————  Cron schedule  ——————————————— */
-- Removes any prior job with the same name, then schedules
SELECT cron.unschedule('refresh_vibe_clusters_with_metrics')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_vibe_clusters_with_metrics');

SELECT cron.schedule(
  'refresh_vibe_clusters_with_metrics',
  '* * * * *',    -- every minute
  $$SELECT public.refresh_vibe_clusters_with_metrics();$$
);