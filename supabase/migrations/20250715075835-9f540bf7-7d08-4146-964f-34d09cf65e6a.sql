-- Phase 2A: Real-time Cluster Update System with Production Optimizations

-- Helper table to track cluster state changes with safety constraints
CREATE TABLE IF NOT EXISTS public.vibe_clusters_checksum (
  id integer PRIMARY KEY DEFAULT 1,
  checksum text NOT NULL,
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Function to detect and broadcast cluster changes
CREATE OR REPLACE FUNCTION public.publish_cluster_deltas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '2s'
AS $$
DECLARE
  new_sum text;
  old_sum text;
BEGIN
  -- Calculate checksum of current cluster state with safety guards
  SELECT md5(COALESCE(string_agg(gh6||':'||total::text, ',' ORDER BY gh6), ''))
  INTO new_sum
  FROM public.vibe_clusters
  FOR SHARE;
  
  -- Get previous checksum
  SELECT checksum INTO old_sum 
  FROM public.vibe_clusters_checksum 
  WHERE id = 1;
  
  -- Only notify if state changed
  IF new_sum IS DISTINCT FROM old_sum THEN
    -- Send lightweight payload with just checksum - clients will refetch
    PERFORM pg_notify(
      'clusters_updated', 
      jsonb_build_object('checksum', new_sum)::text
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
SET search_path = 'public'
SET lock_timeout = '2s'
AS $$
DECLARE
  start_time timestamptz := clock_timestamp();
  metric_id uuid;
BEGIN
  -- Insert start record
  INSERT INTO refresh_metrics(view_name, started_at, duration_ms)
  VALUES ('vibe_clusters', start_time, 0)
  RETURNING id INTO metric_id;
  
  -- Refresh the materialized view
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