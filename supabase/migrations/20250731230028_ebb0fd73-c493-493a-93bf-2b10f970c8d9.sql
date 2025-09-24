-- Phase 4: PostGIS Spatial Optimization Migration
-- Migrate from lat/lng pairs to proper PostGIS geography columns

-- ========================================
-- 1. Add PostGIS geography columns
-- ========================================

-- location_history: Add generated geography column
ALTER TABLE public.location_history
ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED;

-- live_positions: Add generated geography column  
ALTER TABLE public.live_positions
ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED;

-- ========================================
-- 2. Create spatial indexes
-- ========================================

-- Spatial index for location_history (tracks, heat-maps, etc.)
CREATE INDEX IF NOT EXISTS idx_location_history_geog
  ON public.location_history
  USING gist (geog);

-- Spatial index for live_positions (nearby queries)
CREATE INDEX IF NOT EXISTS idx_live_positions_geog
  ON public.live_positions
  USING gist (geog);

-- ========================================
-- 3. Rewrite upsert function for PostGIS
-- ========================================

CREATE OR REPLACE FUNCTION public.upsert_live_position(
  p_profile_id   uuid,
  p_latitude     double precision,
  p_longitude    double precision,
  p_accuracy     double precision DEFAULT NULL,
  p_vibe         text            DEFAULT NULL,
  p_visibility   text            DEFAULT 'public'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geog    geography := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
  v_row     live_positions%ROWTYPE;
  v_result  uuid;
BEGIN
  -- Validate inputs
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile ID cannot be null';
  END IF;
  
  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Latitude and longitude cannot be null';
  END IF;
  
  IF p_latitude < -90 OR p_latitude > 90 THEN
    RAISE EXCEPTION 'Invalid latitude: %', p_latitude;
  END IF;
  
  IF p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Invalid longitude: %', p_longitude;
  END IF;

  -- Check existing position
  SELECT * INTO v_row
  FROM live_positions
  WHERE profile_id = p_profile_id;

  IF FOUND THEN
    -- Skip if identical point and <10 s old (using PostGIS distance)
    IF v_row.last_updated > now() - interval '10 seconds'
       AND ST_DWithin(v_row.geog, v_geog, 3)  -- 3 meter tolerance
    THEN
      RETURN v_row.id;
    END IF;
  END IF;

  -- Upsert with PostGIS geography
  INSERT INTO live_positions AS lp
         (profile_id, latitude, longitude, geog, accuracy, vibe, visibility,
          last_updated, expires_at)
  VALUES (p_profile_id, p_latitude, p_longitude, v_geog, p_accuracy, p_vibe, p_visibility,
          now(), now() + interval '5 minutes')
  ON CONFLICT (profile_id)
  DO UPDATE SET
       latitude     = EXCLUDED.latitude,
       longitude    = EXCLUDED.longitude,
       geog         = EXCLUDED.geog,
       accuracy     = EXCLUDED.accuracy,
       vibe         = EXCLUDED.vibe,
       visibility   = EXCLUDED.visibility,
       last_updated = now(),
       expires_at   = now() + interval '5 minutes'
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$;

-- ========================================
-- 4. Spatial query function
-- ========================================

CREATE OR REPLACE FUNCTION public.get_nearby_live_positions(
  p_latitude     double precision,
  p_longitude    double precision,
  p_radius_m     integer DEFAULT 250,
  p_limit        integer DEFAULT 50
)
RETURNS TABLE(
  profile_id     uuid,
  latitude       double precision,
  longitude      double precision,
  distance_m     double precision,
  accuracy       double precision,
  vibe           text,
  last_updated   timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_center geography := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
BEGIN
  RETURN QUERY
  SELECT 
    lp.profile_id,
    lp.latitude,
    lp.longitude,
    ST_Distance(lp.geog, v_center)::double precision AS distance_m,
    lp.accuracy,
    lp.vibe,
    lp.last_updated
  FROM live_positions lp
  WHERE lp.visibility = 'public'
    AND lp.expires_at > now()
    AND ST_DWithin(lp.geog, v_center, p_radius_m)
  ORDER BY ST_Distance(lp.geog, v_center)
  LIMIT p_limit;
END;
$$;

-- ========================================
-- 5. Enhanced cleanup function
-- ========================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_live_positions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM live_positions
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO location_metrics (metric_name, metric_value, recorded_at)
  VALUES ('cleanup_deleted_positions', deleted_count, now());
  
  RETURN deleted_count;
END;
$$;

-- ========================================
-- 6. Schedule cleanup job (every 2 minutes)
-- ========================================

-- Remove existing cron job if it exists
SELECT cron.unschedule('cleanup-live-positions');

-- Schedule new cleanup job
SELECT cron.schedule(
  'cleanup-live-positions',
  '*/2 * * * *',  -- every 2 minutes
  $$SELECT public.cleanup_expired_live_positions();$$
);

-- ========================================
-- 7. Grant permissions
-- ========================================

GRANT EXECUTE ON FUNCTION public.upsert_live_position(uuid, double precision, double precision, double precision, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_live_positions(double precision, double precision, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_live_positions() TO service_role;

-- ========================================
-- 8. Update RLS policies for spatial optimization
-- ========================================

-- Drop existing policies to recreate with spatial optimization
DROP POLICY IF EXISTS "live_positions_read_public" ON public.live_positions;
DROP POLICY IF EXISTS "live_positions_read_own" ON public.live_positions;

-- Enhanced public read policy with optional bbox filtering
CREATE POLICY "live_positions_read_public" ON public.live_positions
  FOR SELECT
  USING (
    visibility = 'public' 
    AND expires_at > now()
    -- Optional: Add bbox filtering if app sets these settings
    AND (
      current_setting('app.req_lat', true) IS NULL
      OR ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(
          current_setting('app.req_lng')::double precision,
          current_setting('app.req_lat')::double precision
        ), 4326)::geography,
        5000  -- 5km max radius for public queries
      )
    )
  );

-- Own positions policy
CREATE POLICY "live_positions_read_own" ON public.live_positions
  FOR SELECT
  USING (profile_id = auth.uid());

-- ========================================
-- 9. Add monitoring views
-- ========================================

-- View for spatial query performance monitoring
CREATE OR REPLACE VIEW public.live_positions_stats AS
SELECT 
  COUNT(*) as total_positions,
  COUNT(*) FILTER (WHERE expires_at > now()) as active_positions,
  COUNT(*) FILTER (WHERE visibility = 'public') as public_positions,
  AVG(accuracy) as avg_accuracy_m,
  MAX(last_updated) as most_recent_update
FROM live_positions;

GRANT SELECT ON public.live_positions_stats TO authenticated;