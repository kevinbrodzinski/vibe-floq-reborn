-- 1. Function to auto-calculate duration_hours
CREATE OR REPLACE FUNCTION public.update_plan_duration_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if both times are present
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    IF NEW.end_time >= NEW.start_time THEN
      -- Same day duration
      NEW.duration_hours := EXTRACT(EPOCH FROM (NEW.end_time::time - NEW.start_time::time)) / 3600;
    ELSE
      -- Cross-midnight duration
      NEW.duration_hours := (
        86400 - EXTRACT(EPOCH FROM NEW.start_time::time) + EXTRACT(EPOCH FROM NEW.end_time::time)
      ) / 3600;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Trigger to recalculate duration_hours on insert/update
DROP TRIGGER IF EXISTS trg_update_plan_duration_hours ON public.floq_plans;

CREATE TRIGGER trg_update_plan_duration_hours
  BEFORE INSERT OR UPDATE OF start_time, end_time
  ON public.floq_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plan_duration_hours();