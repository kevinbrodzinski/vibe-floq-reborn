-- =========  B-1: momentum view & history  =========

-- ❶ history table – one row / cluster / refresh
CREATE TABLE IF NOT EXISTS public.vibe_clusters_history (
  gh6          text    NOT NULL,
  total        int     NOT NULL,
  snapshot_at  timestamptz DEFAULT now(),
  PRIMARY KEY (gh6,snapshot_at)
);

-- ❷ materialised view: 5-min & 15-min deltas
DROP MATERIALIZED VIEW IF EXISTS public.vibe_cluster_momentum;
CREATE MATERIALIZED VIEW public.vibe_cluster_momentum AS
SELECT
  vc.gh6,
  vc.centroid,
  vc.total                                    AS total_now,
  vc.dom_vibe,
  vc.dom_count,
  COALESCE(vc.total - h5.total, 0)           AS delta_5m,
  COALESCE(vc.total - h15.total,0)           AS delta_15m
FROM  public.vibe_clusters vc
LEFT  JOIN LATERAL (
        SELECT total FROM public.vibe_clusters_history
        WHERE gh6 = vc.gh6
          AND snapshot_at > now() - interval '5 min'
        ORDER BY snapshot_at ASC LIMIT 1) h5 ON true
LEFT  JOIN LATERAL (
        SELECT total FROM public.vibe_clusters_history
        WHERE gh6 = vc.gh6
          AND snapshot_at > now() - interval '15 min'
        ORDER BY snapshot_at ASC LIMIT 1) h15 ON true
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS vibe_cluster_momentum_pk
  ON public.vibe_cluster_momentum(gh6);

CREATE INDEX IF NOT EXISTS vibe_cluster_momentum_centroid_gix
  ON public.vibe_cluster_momentum
  USING GIST(centroid);

-- ❸ trigger to snapshot after each refresh of vibe_clusters
CREATE OR REPLACE FUNCTION public.snapshot_vibe_clusters()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.vibe_clusters_history (gh6,total,snapshot_at)
  SELECT gh6,total,now() FROM public.vibe_clusters
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END $$;

-- attach trigger to the existing REFRESH MATERIALIZED VIEW workflow
DROP TRIGGER IF EXISTS trg_snapshot_vibe_clusters ON public.vibe_clusters;
CREATE TRIGGER trg_snapshot_vibe_clusters
AFTER REFRESH ON public.vibe_clusters
FOR EACH STATEMENT EXECUTE FUNCTION public.snapshot_vibe_clusters();

-- ❹ hot-spot publisher (delta_5m ≥ 3)
CREATE OR REPLACE FUNCTION public.publish_hotspots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE payload jsonb;
BEGIN
  SELECT jsonb_agg(
           jsonb_build_object(
             'gh6', gh6,
             'dom_vibe', dom_vibe,
             'delta', delta_5m,
             'centroid', ST_AsGeoJSON(centroid)::jsonb))
  INTO payload
  FROM public.vibe_cluster_momentum
  WHERE delta_5m >= 3;

  IF payload IS NOT NULL THEN
    PERFORM pg_notify('hotspots_updated', payload::text);
  END IF;
END $$;

COMMENT ON FUNCTION public.publish_hotspots IS 'Broadcast list of surging clusters every minute';

-- ❺ cron – run after presence-counts job
SELECT cron.schedule(
  'publish_hotspots',
  '* * * * *',
  $$SELECT public.publish_hotspots();$$
)
ON CONFLICT (jobname) DO NOTHING;