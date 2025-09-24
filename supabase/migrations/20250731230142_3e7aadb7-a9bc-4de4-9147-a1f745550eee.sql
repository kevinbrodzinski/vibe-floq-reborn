-- Phase 4: Create Location System Tables and PostGIS Optimization
-- First create the base tables, then add PostGIS enhancements

-- ========================================
-- 1. Create base tables
-- ========================================

-- location_history table for tracking user movement
CREATE TABLE IF NOT EXISTS public.location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- live_positions table for current user locations
CREATE TABLE IF NOT EXISTS public.live_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  vibe text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamp with time zone DEFAULT now()
);

-- location_metrics table for monitoring
CREATE TABLE IF NOT EXISTS public.location_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ========================================
-- 2. Enable RLS
-- ========================================

ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_metrics ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. Create RLS policies
-- ========================================

-- location_history policies
CREATE POLICY "location_history_own" ON public.location_history
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- live_positions policies  
CREATE POLICY "live_positions_own" ON public.live_positions
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "live_positions_read_public" ON public.live_positions
  FOR SELECT USING (visibility = 'public' AND expires_at > now());

-- location_metrics policies
CREATE POLICY "location_metrics_own" ON public.location_metrics
  FOR ALL USING (profile_id = auth.uid() OR profile_id IS NULL)
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

-- ========================================
-- 4. Add PostGIS geography columns
-- ========================================

-- location_history: Add generated geography column
ALTER TABLE public.location_history
ADD COLUMN geog geography(Point, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED;

-- live_positions: Add generated geography column  
ALTER TABLE public.live_positions
ADD COLUMN geog geography(Point, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED;

-- ========================================
-- 5. Create spatial indexes
-- ========================================

-- Basic indexes first
CREATE INDEX IF NOT EXISTS idx_location_history_profile_recorded 
  ON public.location_history(profile_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_positions_expires_visibility
  ON public.live_positions(expires_at, visibility) WHERE expires_at > now();

CREATE INDEX IF NOT EXISTS idx_location_metrics_recorded
  ON public.location_metrics(recorded_at DESC);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_location_history_geog
  ON public.location_history USING gist (geog);

CREATE INDEX IF NOT EXISTS idx_live_positions_geog
  ON public.live_positions USING gist (geog);

-- ========================================
-- 6. Create PostGIS-optimized functions
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
  
  IF NOT (p_latitude BETWEEN -90 AND 90) THEN
    RAISE EXCEPTION 'Invalid latitude: %', p_latitude;
  END IF;
  
  IF NOT (p_longitude BETWEEN -180 AND 180) THEN
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
  INSERT INTO live_positions
         (profile_id, latitude, longitude, accuracy, vibe, visibility,
          last_updated, expires_at)
  VALUES (p_profile_id, p_latitude, p_longitude, p_accuracy, p_vibe, p_visibility,
          now(), now() + interval '5 minutes')
  ON CONFLICT (profile_id)
  DO UPDATE SET
       latitude     = EXCLUDED.latitude,
       longitude    = EXCLUDED.longitude,
       accuracy     = EXCLUDED.accuracy,
       vibe         = EXCLUDED.vibe,
       visibility   = EXCLUDED.visibility,
       last_updated = now(),
       expires_at   = now() + interval '5 minutes'
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$;

-- Spatial query function for nearby positions
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

-- Cleanup function
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
  
  -- Log cleanup activity if metrics table exists
  IF deleted_count > 0 THEN
    INSERT INTO location_metrics (metric_name, metric_value, recorded_at)
    VALUES ('cleanup_deleted_positions', deleted_count, now());
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- ========================================
-- 7. Grant permissions
-- ========================================

GRANT EXECUTE ON FUNCTION public.upsert_live_position(uuid, double precision, double precision, double precision, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_live_positions(double precision, double precision, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_live_positions() TO service_role;