-- Row-level security policies for location data

ALTER TABLE public.raw_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_own_location_data
  ON public.raw_locations
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS users_own_venue_visits
  ON public.venue_visits
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());