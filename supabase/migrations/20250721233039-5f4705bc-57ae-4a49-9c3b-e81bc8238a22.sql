-- Fix duration_seconds column to allow NULL values
ALTER TABLE public.plan_transit_cache 
  ALTER COLUMN duration_seconds DROP NOT NULL;

-- Add unique constraint for bidirectional routes (A→B same as B→A)
CREATE UNIQUE INDEX IF NOT EXISTS uq_transit_cache_bidir
  ON public.plan_transit_cache(
    plan_id,
    least(from_stop_id, to_stop_id),
    greatest(from_stop_id, to_stop_id)
  );

-- Update trigger to handle INSERT/DELETE as well as UPDATE
DROP TRIGGER IF EXISTS trg_touch_transit_cache ON public.plan_stops;

CREATE OR REPLACE FUNCTION public.touch_transit_cache_on_stop_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE public.plan_transit_cache
       SET updated_at = now()
     WHERE from_stop_id = NEW.id
        OR to_stop_id = NEW.id;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE public.plan_transit_cache
       SET updated_at = now()
     WHERE from_stop_id = OLD.id
        OR to_stop_id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_touch_transit_cache
  AFTER INSERT OR UPDATE OF location OR DELETE
  ON public.plan_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_transit_cache_on_stop_change();