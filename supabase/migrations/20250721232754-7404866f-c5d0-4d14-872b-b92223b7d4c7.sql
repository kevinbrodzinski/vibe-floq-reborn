/* ------------------------------------------------------------------
   1. Spatial index & geometry columns
   -----------------------------------------------------------------*/

/* 1-a  GIST index for fast nearest-neighbour look-ups */
CREATE INDEX IF NOT EXISTS idx_plan_stops_location_gist
  ON public.plan_stops
  USING GIST (location);

/* 1-b  Store coords used for each cached leg              */
ALTER TABLE public.plan_transit_cache
  ADD COLUMN IF NOT EXISTS from_geom geometry(Point,4326),
  ADD COLUMN IF NOT EXISTS to_geom   geometry(Point,4326);

/* ------------------------------------------------------------------
   2. Cache invalidation when a stop is moved
   -----------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION public.touch_transit_cache_on_stop_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.plan_transit_cache
     SET updated_at = now()
   WHERE from_stop_id = NEW.id
      OR to_stop_id   = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_transit_cache ON public.plan_stops;
CREATE TRIGGER trg_touch_transit_cache
  AFTER UPDATE OF location
  ON public.plan_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_transit_cache_on_stop_update();

/* ------------------------------------------------------------------
   3. RLS – allow plan participants (not only floq participants)
   -----------------------------------------------------------------*/
DROP POLICY IF EXISTS "Transit cache readable by plan participants"
  ON public.plan_transit_cache;

CREATE POLICY "Transit cache readable by plan participants"
  ON public.plan_transit_cache
  FOR SELECT
  USING (
     EXISTS (SELECT 1
               FROM public.plan_participants pp
              WHERE pp.plan_id = plan_transit_cache.plan_id
                AND pp.user_id = auth.uid())
     OR
     EXISTS (SELECT 1
               FROM public.floq_participants fp
               JOIN public.floq_plans p  ON p.floq_id = fp.floq_id
              WHERE p.id = plan_transit_cache.plan_id
                AND fp.user_id = auth.uid())
  );

/* ------------------------------------------------------------------
   4. 24-hour cache-cleanup helper      (optional – cron via pg_cron)
   -----------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION public.cleanup_old_transit_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.plan_transit_cache
        WHERE updated_at < now() - interval '24 hours';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;