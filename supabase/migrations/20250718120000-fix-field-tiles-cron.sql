
-- Fix the field tiles refresh cron job to ensure it runs properly
-- This migration ensures the cron job is scheduled correctly

-- First, unschedule any existing field tiles refresh jobs to avoid conflicts
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname LIKE '%field_tiles%';

-- Create the refresh function with proper error handling and logging
CREATE OR REPLACE FUNCTION public.refresh_field_tiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the cron execution
  RAISE LOG '⏰ refresh_field_tiles cron started at %', now();
  
  WITH agg AS (
    SELECT
      gh5                                           as tile_id,
      count(*)::int                                 as crowd_count,
      jsonb_build_object(
        'h', avg(vibe_h)::real,
        's', avg(vibe_s)::real,
        'l', avg(vibe_l)::real
      )                                             as avg_vibe,
      array_remove(array_agg(distinct floq_id),NULL) as active_floq_ids
    FROM public.vibes_now
    WHERE expires_at > now()
      AND gh5 IS NOT NULL
    GROUP BY gh5
  )
  INSERT INTO public.field_tiles (tile_id, crowd_count, avg_vibe,
                                  active_floq_ids, updated_at)
  SELECT tile_id, crowd_count, avg_vibe, active_floq_ids, now()
  FROM   agg
  ON CONFLICT (tile_id) DO UPDATE
    SET crowd_count     = excluded.crowd_count,
        avg_vibe        = excluded.avg_vibe,
        active_floq_ids = excluded.active_floq_ids,
        updated_at      = excluded.updated_at;
        
  -- Log completion
  RAISE LOG '⏰ refresh_field_tiles cron completed at %', now();
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors
  RAISE LOG '⏰ refresh_field_tiles cron error: %', SQLERRM;
  RAISE;
END;
$$;

-- Grant execute permission to the cron extension
GRANT EXECUTE ON FUNCTION public.refresh_field_tiles() TO service_role;

-- Schedule the cron job to run every 5 seconds
SELECT cron.schedule(
  'refresh_field_tiles_5s',
  '*/5 * * * * *',  -- Every 5 seconds
  $$SELECT public.refresh_field_tiles();$$
);

-- Also create the cleanup function and schedule it
CREATE OR REPLACE FUNCTION public.cleanup_field_tiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.field_tiles
  WHERE updated_at < now() - interval '5 minutes';
  
  RAISE LOG '⏰ cleanup_field_tiles completed, removed stale tiles';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_field_tiles() TO service_role;

-- Schedule cleanup every minute
SELECT cron.schedule(
  'cleanup_field_tiles_60s',
  '0 * * * * *',  -- Every 60 seconds at second 0
  $$SELECT public.cleanup_field_tiles();$$
);
