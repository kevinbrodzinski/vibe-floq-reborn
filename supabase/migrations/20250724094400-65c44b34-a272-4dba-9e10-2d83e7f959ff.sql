-- Create partitioned raw_locations table for GPS pings
CREATE TABLE IF NOT EXISTS public.raw_locations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id     UUID        NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  geom        GEOGRAPHY(Point, 4326),
  accuracy_m  INTEGER,
  PRIMARY KEY (id, captured_at)
) PARTITION BY RANGE (captured_at);

-- Create next 3 monthly partitions
DO $$
DECLARE
  start_date DATE := date_trunc('month', now())::DATE;
  partition_name TEXT;
  start_val DATE;
  end_val DATE;
BEGIN
  FOR i IN 0..2 LOOP
    start_val := start_date + (i * INTERVAL '1 month');
    end_val := start_date + ((i + 1) * INTERVAL '1 month');
    partition_name := 'raw_locations_' || to_char(start_val, 'YYYYMM');
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.raw_locations FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_val, end_val
    );
  END LOOP;
END $$;

-- Create indexes on raw_locations
CREATE INDEX IF NOT EXISTS idx_raw_locations_geom
  ON public.raw_locations USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_raw_locations_user_time
  ON public.raw_locations (user_id, captured_at DESC);

-- Create venue_visits table  
CREATE TABLE IF NOT EXISTS public.venue_visits (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID        NOT NULL,
  venue_id    UUID        NOT NULL REFERENCES public.venues(id),
  arrived_at  TIMESTAMPTZ NOT NULL,
  departed_at TIMESTAMPTZ,
  distance_m  NUMERIC,
  day_key     DATE        NOT NULL
);

-- Create trigger to update day_key from arrived_at
CREATE OR REPLACE FUNCTION update_venue_visit_day_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.day_key = NEW.arrived_at::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_venue_visit_day_key
  BEFORE INSERT OR UPDATE ON public.venue_visits
  FOR EACH ROW EXECUTE FUNCTION update_venue_visit_day_key();

CREATE INDEX IF NOT EXISTS idx_venue_visits_user_day
  ON public.venue_visits(user_id, day_key);

-- Enable RLS on raw_locations
ALTER TABLE public.raw_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for raw_locations
CREATE POLICY "users_own_location_data" ON public.raw_locations
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable RLS on venue_visits
ALTER TABLE public.venue_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for venue_visits
CREATE POLICY "users_own_venue_visits" ON public.venue_visits
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to match GPS locations to venues
CREATE OR REPLACE FUNCTION public.match_locations_batch(_since TIMESTAMPTZ)
RETURNS INT 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  inserted INT := 0;
BEGIN
  WITH candidates AS (
    SELECT 
      rl.id, 
      rl.user_id, 
      rl.captured_at, 
      rl.geom,
      v.id AS venue_id, 
      v.radius_m,
      ST_Distance(rl.geom, v.geom)::NUMERIC AS dist
    FROM public.raw_locations rl
    JOIN public.venues v
      ON ST_DWithin(rl.geom::geography, v.geom::geography, v.radius_m)
    WHERE rl.captured_at >= _since
  ), ranked AS (
    SELECT *, 
           row_number() OVER (PARTITION BY id ORDER BY dist) AS rn 
    FROM candidates
  )
  INSERT INTO public.venue_visits(user_id, venue_id, arrived_at, distance_m)
  SELECT user_id, venue_id, captured_at, dist
  FROM ranked 
  WHERE rn = 1
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- Create function to build daily afterglow from venue visits
CREATE OR REPLACE FUNCTION public.build_daily_afterglow(_day DATE)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.daily_afterglow(user_id, date, moments, total_venues)
  SELECT 
    user_id,
    _day,
    jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'timestamp', arrived_at,
        'title', v.name,
        'description', 'Visited ' || v.name,
        'color', '#3b82f6',
        'moment_type', 'venue_visit',
        'metadata', jsonb_build_object(
          'venue_id', v.id,
          'venue_name', v.name,
          'distance_m', distance_m,
          'location', jsonb_build_object(
            'lat', ST_Y(v.geom::geometry),
            'lng', ST_X(v.geom::geometry)
          )
        )
      ) ORDER BY arrived_at
    ),
    count(*)::INTEGER
  FROM public.venue_visits vv
  JOIN public.venues v ON v.id = vv.venue_id
  WHERE vv.day_key = _day
  GROUP BY user_id
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    moments = EXCLUDED.moments,
    total_venues = EXCLUDED.total_venues,
    regenerated_at = now();
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule venue matching every 5 minutes
SELECT cron.schedule(
  'match_gps_venues',
  '*/5 * * * *',
  $$SELECT public.match_locations_batch(now() - INTERVAL '10 minutes');$$
);

-- Schedule daily afterglow build at 3 AM UTC
SELECT cron.schedule(
  'build_afterglow_3am',
  '0 3 * * *',
  $$SELECT public.build_daily_afterglow((now() - INTERVAL '1 day')::DATE);$$
);