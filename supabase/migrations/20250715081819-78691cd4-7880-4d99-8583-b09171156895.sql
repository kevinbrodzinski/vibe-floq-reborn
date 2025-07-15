-- Enhanced vibe_clusters materialized view with popularity and momentum
-- Production-optimized version with better performance

DROP MATERIALIZED VIEW IF EXISTS public.vibe_clusters;

CREATE MATERIALIZED VIEW public.vibe_clusters AS
WITH live_filtered AS (
  SELECT 
    ST_GeoHash(uvs.location::geometry, 6) as gh6,
    uvs.vibe_tag,
    uvs.location::geometry as geom,
    uvs.started_at
  FROM public.user_vibe_states uvs
  WHERE uvs.active = TRUE 
    AND uvs.started_at > (now() - interval '90 minutes')
    AND uvs.location IS NOT NULL
),
vibe_counts_with_momentum AS (
  SELECT 
    gh6, 
    vibe_tag,
    COUNT(*) as cnt,
    -- Calculate popularity (total activity in area)
    COUNT(*) * EXP(-EXTRACT(EPOCH FROM (now() - MAX(started_at))) / 3600.0) as popularity,
    -- Calculate momentum (recent activity boost)
    CASE 
      WHEN MAX(started_at) > (now() - interval '15 minutes') 
      THEN COUNT(*) * 2.0 
      ELSE 0.0 
    END as momentum,
    -- Collect geometries for centroid calculation
    ST_Collect(geom) as geom_collection
  FROM live_filtered
  GROUP BY gh6, vibe_tag
),
cluster_aggregates AS (
  SELECT 
    gh6,
    ST_Centroid(ST_Collect(geom_collection)) as centroid,
    SUM(cnt)::bigint as total,
    jsonb_object_agg(vibe_tag, cnt) as vibe_counts,
    SUM(popularity) as vibe_popularity,
    SUM(momentum) as vibe_momentum
  FROM vibe_counts_with_momentum
  GROUP BY gh6
  HAVING SUM(cnt) >= 3
)
SELECT 
  gh6,
  centroid,
  total,
  vibe_counts,
  vibe_popularity,
  vibe_momentum,
  now() as last_updated
FROM cluster_aggregates
ORDER BY total DESC;

-- Create indexes for efficient lookups
CREATE UNIQUE INDEX CONCURRENTLY vibe_clusters_gh6_idx ON public.vibe_clusters (gh6);

-- Partial index for hot cluster queries (O(log n) performance)
CREATE INDEX CONCURRENTLY vibe_clusters_hot_idx ON public.vibe_clusters (vibe_momentum) 
WHERE vibe_momentum > 5.0;

-- Enhanced publish_cluster_deltas function with hot cluster detection
CREATE OR REPLACE FUNCTION public.publish_cluster_deltas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $$
DECLARE
  new_sum text;
  old_sum text;
  hot_clusters jsonb;
BEGIN
  -- Calculate checksum including momentum for state changes
  SELECT md5(COALESCE(string_agg(gh6||':'||total||':'||round(vibe_momentum)::text, ',' ORDER BY gh6), ''))
  INTO new_sum
  FROM public.vibe_clusters
  FOR SHARE;
  
  -- Get previous checksum
  SELECT checksum INTO old_sum 
  FROM public.vibe_clusters_checksum 
  WHERE id = 1;
  
  -- Only notify if state changed
  IF new_sum IS DISTINCT FROM old_sum THEN
    -- Get hot clusters for targeted notifications
    SELECT jsonb_agg(jsonb_build_object(
      'cluster_id', gh6,
      'vibe_hint', (
        SELECT key FROM jsonb_each_text(vibe_counts) 
        ORDER BY value::int DESC LIMIT 1
      ),
      'momentum', vibe_momentum
    ))
    INTO hot_clusters
    FROM public.vibe_clusters
    WHERE vibe_momentum > 5.0;
    
    -- Send payload with checksum and hot clusters
    PERFORM pg_notify(
      'clusters_updated', 
      jsonb_build_object(
        'checksum', new_sum,
        'hot_clusters', COALESCE(hot_clusters, '[]'::jsonb)
      )::text
    );
    
    -- Update stored checksum
    INSERT INTO public.vibe_clusters_checksum (id, checksum)
    VALUES (1, new_sum)
    ON CONFLICT (id) DO UPDATE SET 
      checksum = EXCLUDED.checksum;
  END IF;
END;
$$;

-- Enhanced refresh function with cluster delta publishing
CREATE OR REPLACE FUNCTION public.refresh_vibe_clusters_with_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $$
DECLARE
  start_time timestamptz := clock_timestamp();
  metric_id uuid;
BEGIN
  -- Insert start record
  INSERT INTO refresh_metrics(view_name, started_at, duration_ms)
  VALUES ('vibe_clusters', start_time, 0)
  RETURNING id INTO metric_id;
  
  -- Refresh the materialized view concurrently (no locks)
  REFRESH MATERIALIZED VIEW CONCURRENTLY vibe_clusters;
  
  -- Publish cluster deltas after successful refresh
  PERFORM publish_cluster_deltas();
  
  -- Update with actual duration
  UPDATE refresh_metrics
  SET duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
  WHERE id = metric_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Update duration on error if metric record exists
  IF metric_id IS NOT NULL THEN
    UPDATE refresh_metrics
    SET duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    WHERE id = metric_id;
  END IF;
  PERFORM pg_notify('cluster_refresh_error', SQLERRM);
END;
$$;