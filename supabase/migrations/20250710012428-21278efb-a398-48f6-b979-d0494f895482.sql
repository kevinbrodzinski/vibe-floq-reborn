-- Create vibes_log table for tracking user movement history
CREATE TABLE public.vibes_log (
  user_id uuid NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  location geography(point, 4326) NOT NULL,
  venue_id uuid NULL,
  vibe vibe_enum NOT NULL
);

-- Enable RLS
ALTER TABLE public.vibes_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own logs
CREATE POLICY "Users can access their own vibes log" 
ON public.vibes_log 
FOR ALL 
USING (auth.uid() = user_id);

-- Optimized indexes
CREATE INDEX idx_vibes_log_user_ts ON public.vibes_log (user_id, ts DESC);
CREATE INDEX idx_vibes_log_location ON public.vibes_log USING GIST(location);
CREATE INDEX idx_vibes_log_venue ON public.vibes_log (venue_id) WHERE venue_id IS NOT NULL;

-- Cleanup function for old logs (7-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_vibes_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.vibes_log 
  WHERE ts < now() - interval '7 days';
$$;

-- Grant permission to call cleanup function
GRANT EXECUTE ON FUNCTION public.cleanup_old_vibes_logs() TO authenticated;

-- Main function to find people crossed paths with today
CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(
  user_lat numeric, 
  user_lng numeric, 
  proximity_meters numeric DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  last_seen_ts timestamptz,
  last_seen_vibe vibe_enum,
  venue_name text,
  distance_meters integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_point AS (
    SELECT ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326) AS geom
  ),
  my_logs_today AS (
    SELECT ts, location
    FROM vibes_log 
    WHERE vibes_log.user_id = auth.uid()
      AND ts >= date_trunc('day', now())
      AND ts < date_trunc('day', now()) + interval '1 day'
  ),
  their_logs_today AS (
    SELECT l.user_id, l.ts, l.location, l.vibe, l.venue_id
    FROM vibes_log l
    WHERE l.user_id != auth.uid()
      AND l.ts >= date_trunc('day', now())
      AND l.ts < date_trunc('day', now()) + interval '1 day'
  ),
  proximity_matches AS (
    SELECT DISTINCT 
      t.user_id,
      t.vibe,
      t.venue_id,
      MAX(t.ts) AS last_seen_ts,
      MIN(ST_Distance(m.location::geography, t.location::geography)) AS min_distance
    FROM my_logs_today m
    CROSS JOIN their_logs_today t
    WHERE ST_DWithin(m.location::geography, t.location::geography, proximity_meters)
      AND ABS(EXTRACT(EPOCH FROM (t.ts - m.ts))) <= 3600 -- within 1 hour
    GROUP BY t.user_id, t.vibe, t.venue_id
  )
  SELECT 
    pm.user_id,
    p.display_name,
    p.avatar_url,
    pm.last_seen_ts,
    pm.vibe AS last_seen_vibe,
    v.name AS venue_name,
    pm.min_distance::integer AS distance_meters
  FROM proximity_matches pm
  JOIN profiles p ON p.id = pm.user_id
  LEFT JOIN venues v ON v.id = pm.venue_id
  ORDER BY pm.last_seen_ts DESC;
$$;

-- Grant permission to call the function
GRANT EXECUTE ON FUNCTION public.people_crossed_paths_today(numeric, numeric, numeric) TO authenticated;

-- Refined logging mechanism (user's improved version)

-- 1️⃣ Should-we-log function
CREATE OR REPLACE FUNCTION public.should_log_presence(
  p_user uuid,
  p_loc geography(point,4326),
  p_now timestamptz DEFAULT now()
) 
RETURNS boolean
LANGUAGE plpgsql 
STABLE 
AS $$
DECLARE
  _last_ts timestamptz;
  _last_loc geography;
BEGIN
  -- Most-recent row for *today* (avoids scanning large history)
  SELECT ts, location
    INTO _last_ts, _last_loc
    FROM public.vibes_log
   WHERE user_id = p_user
     AND ts >= date_trunc('day', p_now)
   ORDER BY ts DESC
   LIMIT 1;

  -- First row today → log
  IF _last_ts IS NULL THEN
    RETURN true;
  END IF;

  -- 30-second cadence
  IF p_now - _last_ts >= interval '30 seconds' THEN
    RETURN true;
  END IF;

  -- 10-metre movement
  IF st_distance(_last_loc, p_loc) >= 10 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2️⃣ Trigger body
CREATE OR REPLACE FUNCTION public.log_presence_if_needed()
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  _geo geography := geography(st_makepoint(ST_X(NEW.location), ST_Y(NEW.location)));
BEGIN
  IF public.should_log_presence(NEW.user_id, _geo) THEN
    INSERT INTO public.vibes_log (user_id, ts, location, venue_id, vibe)
    VALUES (NEW.user_id, NEW.updated_at, _geo, NEW.venue_id, NEW.vibe);
  END IF;
  RETURN NULL; -- AFTER trigger -> don't modify NEW
END;
$$;

-- 3️⃣ Attach trigger to vibes_now
DROP TRIGGER IF EXISTS trg_log_presence ON public.vibes_now;

CREATE TRIGGER trg_log_presence
  AFTER INSERT OR UPDATE OF location, venue_id -- ignore vibe-only changes
  ON public.vibes_now
  FOR EACH ROW
EXECUTE PROCEDURE public.log_presence_if_needed();