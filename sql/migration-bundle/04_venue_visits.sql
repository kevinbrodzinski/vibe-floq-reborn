-- Venue visits tracking table

CREATE TABLE IF NOT EXISTS public.venue_visits (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL,
  venue_id    uuid NOT NULL REFERENCES public.venues(id),
  arrived_at  timestamptz NOT NULL,
  departed_at timestamptz,
  distance_m  numeric,
  day_key     date GENERATED ALWAYS AS (arrived_at::date) STORED
);

CREATE INDEX IF NOT EXISTS idx_venue_visits_user_day ON public.venue_visits(user_id, day_key);

-- Trigger to automatically set day_key
CREATE OR REPLACE FUNCTION public.update_venue_visit_day_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.day_key = NEW.arrived_at::DATE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_venue_visit_day_key
  BEFORE INSERT OR UPDATE ON public.venue_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_venue_visit_day_key();