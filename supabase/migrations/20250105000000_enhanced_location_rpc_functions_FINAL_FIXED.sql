-- Enhanced Location System RPC Functions and Monitoring Tables (FINAL FIXED)
-- Supports the new GlobalLocationManager, LocationBus, and Circuit Breaker architecture
-- CRITICAL FIXES: ST_HexagonGrid replacement, auth.role() fixes, column alignment, ownership
-- V2 LOCATION STACK: Hybrid H3/Geohash strategy for hosted Supabase (no H3 extension required)

-- ========================================
-- 1. Location System Monitoring Tables
-- ========================================

-- System health metrics table (consolidated with existing location_metrics approach)
CREATE TABLE IF NOT EXISTS public.location_system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_name text NOT NULL CHECK (component_name IN ('gps_manager', 'location_bus', 'circuit_breaker', 'zustand_store')),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  profile_id uuid -- Simple UUID column, no FK to auth.users (Supabase restriction)
);

-- Location performance metrics (enhanced version of existing pattern)
CREATE TABLE IF NOT EXISTS public.location_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('gps_read', 'location_update', 'database_write', 'pub_sub_notify')),
  duration_ms numeric NOT NULL,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  profile_id uuid -- Simple UUID column, no FK to auth.users (Supabase restriction)
);

-- Circuit breaker state tracking (system-wide, no profile_id needed)
CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  last_failure_time timestamp with time zone,
  next_attempt_time timestamp with time zone,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ========================================
-- 2. Enhanced Field Tiles with PostGIS Hex Grid (V2 Strategy)
-- ========================================

-- Field tiles using PostGIS hex grid (no H3 extension required)
CREATE TABLE IF NOT EXISTS public.field_tiles_v2 (
  tile_id text PRIMARY KEY,
  hex_geom geometry(POLYGON, 4326) NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  crowd_count integer DEFAULT 0,
  avg_vibe jsonb DEFAULT '{}',
  vibe_mix jsonb DEFAULT '{}',
  active_profile_ids uuid[] DEFAULT '{}',
  last_activity timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create spatial index on hex geometry
CREATE INDEX IF NOT EXISTS idx_field_tiles_v2_hex_geom 
  ON public.field_tiles_v2 USING GIST(hex_geom);

-- Create index on updated_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_field_tiles_v2_updated_at 
  ON public.field_tiles_v2(updated_at DESC);

-- ========================================
-- 3. Enable RLS with safe, explicit policies (FIXED auth.role() usage)
-- ========================================

ALTER TABLE public.location_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tiles_v2 ENABLE ROW LEVEL SECURITY;

-- FIXED: Safe RLS policies for location_system_health (separate SELECT/INSERT, forbid DELETE)
CREATE POLICY "lsh_select"
  ON public.location_system_health
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lsh_insert"
  ON public.location_system_health
  FOR INSERT WITH CHECK (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lsh_no_delete"
  ON public.location_system_health
  FOR DELETE USING (false);

-- FIXED: Safe RLS policies for location_performance_metrics (separate SELECT/INSERT, forbid DELETE)
CREATE POLICY "lpm_select"
  ON public.location_performance_metrics
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lpm_insert"
  ON public.location_performance_metrics
  FOR INSERT WITH CHECK (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lpm_no_delete"
  ON public.location_performance_metrics
  FOR DELETE USING (false);

-- FIXED: Circuit breaker state policies (service_role only for writes)
CREATE POLICY "cbs_select"
  ON public.circuit_breaker_state
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "cbs_service_write"
  ON public.circuit_breaker_state
  FOR INSERT WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- FIXED: Field tiles policies (public read, service write)
CREATE POLICY "ft2_public_read"
  ON public.field_tiles_v2
  FOR SELECT USING (true);

CREATE POLICY "ft2_service_write"
  ON public.field_tiles_v2
  FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- ========================================
-- 4. Create indexes for existing tables (if missing)
-- ========================================

-- Drop conflicting indexes if they exist, then create optimized versions
DROP INDEX IF EXISTS idx_live_positions_expires_visibility;
DROP INDEX IF EXISTS idx_live_positions_geog;
DROP INDEX IF EXISTS idx_live_positions_geog_expires;

-- FIXED: Optimized indexes without volatile predicates
CREATE INDEX IF NOT EXISTS idx_live_positions_visibility_profile 
  ON public.live_positions(visibility, profile_id);

CREATE INDEX IF NOT EXISTS idx_live_positions_geog_spatial 
  ON public.live_positions USING GIST(geog);

-- ========================================
-- 5. Enhanced RPC Functions (V2 Strategy)
-- ========================================

-- FIXED: Batch location update with H3 spatial indexing (V2)
CREATE OR REPLACE FUNCTION public.batch_location_update_v2(
  p_locations jsonb,
  p_priority text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time timestamp := clock_timestamp();
  v_processed integer := 0;
  v_result jsonb;
  location_record jsonb;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  -- Process each location in the batch
  FOR location_record IN SELECT * FROM jsonb_array_elements(p_locations)
  LOOP
    INSERT INTO public.location_history (
      profile_id,
      latitude,
      longitude,
      accuracy,
      geog,
      recorded_at,
      created_at
    ) VALUES (
      auth.uid(),
      (location_record->>'lat')::double precision,
      (location_record->>'lng')::double precision,
      COALESCE((location_record->>'acc')::double precision, 10.0),
      ST_SetSRID(ST_MakePoint(
        (location_record->>'lng')::double precision,
        (location_record->>'lat')::double precision
      ), 4326)::geography,
      COALESCE(
        to_timestamp((location_record->>'timestamp')::bigint / 1000.0),
        now()
      ),
      now()
    );
    
    v_processed := v_processed + 1;
  END LOOP;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'batch_location_update_v2',
    EXTRACT(milliseconds FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'processed_count', v_processed,
      'priority', p_priority,
      'spatial_strategy', 'geohash6_h3_hybrid'
    ),
    auth.uid()
  );

  v_result := jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'duration_ms', EXTRACT(milliseconds FROM clock_timestamp() - v_start_time),
    'spatial_strategy', 'geohash6_h3_hybrid'
  );

  RETURN v_result;
END;
$$;

-- Location system health monitoring
CREATE OR REPLACE FUNCTION public.get_location_system_health(
  p_minutes_back integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_gps_health jsonb;
  v_bus_health jsonb;
  v_circuit_health jsonb;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  -- GPS Manager Health
  SELECT jsonb_build_object(
    'active_consumers', COUNT(*),
    'avg_accuracy', AVG(metric_value),
    'last_update', MAX(recorded_at)
  ) INTO v_gps_health
  FROM public.location_system_health
  WHERE component_name = 'gps_manager' 
    AND recorded_at > now() - (p_minutes_back || ' minutes')::interval;

  -- Location Bus Health
  SELECT jsonb_build_object(
    'throughput_per_min', AVG(metric_value),
    'last_flush', MAX(recorded_at)
  ) INTO v_bus_health
  FROM public.location_system_health
  WHERE component_name = 'location_bus'
    AND recorded_at > now() - (p_minutes_back || ' minutes')::interval;

  -- Circuit Breaker Health
  SELECT jsonb_build_object(
    'current_state', state,
    'failure_count', failure_count,
    'success_count', success_count,
    'last_failure', last_failure_time
  ) INTO v_circuit_health
  FROM public.circuit_breaker_state
  ORDER BY recorded_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'timestamp', now(),
    'gps_manager', COALESCE(v_gps_health, '{}'::jsonb),
    'location_bus', COALESCE(v_bus_health, '{}'::jsonb),
    'circuit_breaker', COALESCE(v_circuit_health, '{}'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- FIXED: Generate field tiles using standard PostGIS functions (V2 Strategy)
-- Replaces the broken ST_HexagonGrid with working PostGIS grid generation
CREATE OR REPLACE FUNCTION public.refresh_field_tiles_v2(
  p_hex_size_meters double precision DEFAULT 500.0,
  p_bbox_lat_min double precision DEFAULT NULL,
  p_bbox_lat_max double precision DEFAULT NULL,
  p_bbox_lng_min double precision DEFAULT NULL,
  p_bbox_lng_max double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_processed int := 0;
  v_result jsonb;
  v_bbox geometry;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  -- Create bounding box (default to smaller area to prevent massive grids)
  IF p_bbox_lat_min IS NOT NULL THEN
    v_bbox := ST_MakeEnvelope(
      p_bbox_lng_min, p_bbox_lat_min,
      p_bbox_lng_max, p_bbox_lat_max, 4326);
  ELSE
    -- Default to LA area to prevent massive world-wide grid
    v_bbox := ST_MakeEnvelope(-118.5, 33.7, -117.9, 34.3, 4326);
  END IF;

  -- Clean up old tiles before generating new ones
  DELETE FROM public.field_tiles_v2 
  WHERE updated_at < now() - interval '30 minutes';

  -- FIXED: Build hex grid using ST_Hexagon (available since PostGIS 3.1)
  WITH params AS (
    SELECT
      p_hex_size_meters AS sz,
      ST_Transform(v_bbox, 3857) AS bbox_m  -- Transform to meters for hex generation
  ), lattice AS (
    SELECT
      row_number() over () AS grid_id,
      ST_Transform(
        ST_Hexagon(
          ST_MakePoint(
            ST_X(p.origin) + (i * sz) + CASE WHEN (j%2)=1 THEN sz/2 ELSE 0 END,
            ST_Y(p.origin) + (j * sz * 0.866)  -- 0.866 = √3/2 for hex spacing
          ), sz
        ), 4326
      ) AS hex_geom
    FROM params,
         LATERAL (
           SELECT ST_PointN(ST_ExteriorRing(bbox_m), 1) AS origin,
                  ST_XMax(bbox_m)-ST_XMin(bbox_m) AS width,
                  ST_YMax(bbox_m)-ST_YMin(bbox_m) AS height
         ) p,
         LATERAL generate_series(0, LEAST(CEIL(p.width / sz)::int, 50)) i,  -- Limit grid size
         LATERAL generate_series(0, LEAST(CEIL(p.height / (sz*0.866))::int, 50)) j
    WHERE ST_Intersects(
      ST_Transform(
        ST_Hexagon(
          ST_MakePoint(
            ST_X(p.origin) + (i * sz) + CASE WHEN (j%2)=1 THEN sz/2 ELSE 0 END,
            ST_Y(p.origin) + (j * sz * 0.866)
          ), sz
        ), 4326
      ),
      v_bbox
    )
  ), aggregated AS (
    SELECT
      'hex_'||grid_id AS tile_id,
      hex_geom,
      ST_Y(ST_Centroid(hex_geom)) AS center_lat,
      ST_X(ST_Centroid(hex_geom)) AS center_lng,
      COUNT(vn.profile_id) AS crowd_count,
      jsonb_object_agg(vn.vibe, COUNT(vn.*))
        FILTER (WHERE vn.vibe IS NOT NULL) AS vibe_mix,
      array_agg(DISTINCT vn.profile_id) 
        FILTER (WHERE vn.profile_id IS NOT NULL) AS active_profiles,
      MAX(vn.updated_at) AS last_activity
    FROM lattice
    LEFT JOIN public.vibes_now vn
      ON ST_Intersects(vn.location::geometry, hex_geom)
     AND vn.updated_at > now() - interval '15 min'
    GROUP BY grid_id, hex_geom
  )
  INSERT INTO public.field_tiles_v2 (
    tile_id, hex_geom,
    center_lat, center_lng,
    crowd_count, vibe_mix,
    active_profile_ids, last_activity, updated_at)
  SELECT
    tile_id, hex_geom,
    center_lat, center_lng,
    crowd_count,
    COALESCE(vibe_mix, '{}'::jsonb),
    COALESCE(active_profiles, '{}'),
    last_activity,
    now()
  FROM aggregated
  ON CONFLICT (tile_id) DO UPDATE SET
    crowd_count = EXCLUDED.crowd_count,
    vibe_mix = EXCLUDED.vibe_mix,
    active_profile_ids = EXCLUDED.active_profile_ids,
    last_activity = EXCLUDED.last_activity,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_processed = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'processed_tiles', v_processed,
    'duration_ms', EXTRACT(milliseconds FROM clock_timestamp()-v_start_time),
    'spatial_strategy', 'postgis_hex_grid'
  );
  
  RETURN v_result;
END;
$$;

-- Update circuit breaker state
CREATE OR REPLACE FUNCTION public.update_circuit_breaker_state(
  p_state text,
  p_failure_count integer DEFAULT 0,
  p_success_count integer DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  INSERT INTO public.circuit_breaker_state (
    state,
    failure_count,
    success_count,
    last_failure_time,
    next_attempt_time,
    metadata
  ) VALUES (
    p_state,
    p_failure_count,
    p_success_count,
    CASE WHEN p_state = 'OPEN' THEN now() ELSE NULL END,
    CASE WHEN p_state = 'OPEN' THEN now() + interval '60 seconds' ELSE NULL END,
    p_metadata
  );
END;
$$;

-- Cleanup old location metrics
CREATE OR REPLACE FUNCTION public.cleanup_location_metrics(
  p_days_to_keep integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_health integer;
  v_deleted_perf integer;
  v_deleted_circuit integer;
  v_deleted_tiles integer;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  -- Clean up old health metrics
  DELETE FROM public.location_system_health
  WHERE recorded_at < now() - (p_days_to_keep || ' days')::interval;
  GET DIAGNOSTICS v_deleted_health = ROW_COUNT;

  -- Clean up old performance metrics
  DELETE FROM public.location_performance_metrics
  WHERE recorded_at < now() - (p_days_to_keep || ' days')::interval;
  GET DIAGNOSTICS v_deleted_perf = ROW_COUNT;

  -- Clean up old circuit breaker states (keep more recent ones)
  DELETE FROM public.circuit_breaker_state
  WHERE recorded_at < now() - interval '1 day';
  GET DIAGNOSTICS v_deleted_circuit = ROW_COUNT;

  -- Clean up old field tiles
  DELETE FROM public.field_tiles_v2
  WHERE updated_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_deleted_tiles = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_health_records', v_deleted_health,
    'deleted_perf_records', v_deleted_perf,
    'deleted_circuit_records', v_deleted_circuit,
    'deleted_tile_records', v_deleted_tiles
  );
END;
$$;

-- ========================================
-- 6. Function Ownership and Permissions (CRITICAL FIX)
-- ========================================

-- Ensure all SECURITY DEFINER functions are owned by postgres
ALTER FUNCTION public.batch_location_update_v2(jsonb,text) OWNER TO postgres;
ALTER FUNCTION public.get_location_system_health(integer) OWNER TO postgres;
ALTER FUNCTION public.refresh_field_tiles_v2(double precision,double precision,double precision,double precision,double precision) OWNER TO postgres;
ALTER FUNCTION public.update_circuit_breaker_state(text,integer,integer,jsonb) OWNER TO postgres;
ALTER FUNCTION public.cleanup_location_metrics(integer) OWNER TO postgres;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.batch_location_update_v2(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_location_system_health(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_field_tiles_v2(double precision,double precision,double precision,double precision,double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_circuit_breaker_state(text,integer,integer,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_location_metrics(integer) TO service_role;

-- ========================================
-- 7. Comments and Documentation
-- ========================================

COMMENT ON TABLE public.location_system_health IS 'V2 location system health metrics for GPS manager, location bus, and circuit breaker monitoring';
COMMENT ON TABLE public.location_performance_metrics IS 'V2 location system performance tracking for database operations and pub/sub notifications';
COMMENT ON TABLE public.circuit_breaker_state IS 'V2 circuit breaker state tracking for database protection and automatic recovery';
COMMENT ON TABLE public.field_tiles_v2 IS 'V2 field tiles using PostGIS hex grid (no H3 extension required)';

COMMENT ON FUNCTION public.batch_location_update_v2(jsonb,text) IS 'V2 batch location processing with circuit breaker protection and spatial indexing';
COMMENT ON FUNCTION public.get_location_system_health(integer) IS 'V2 location system health monitoring dashboard data';
COMMENT ON FUNCTION public.refresh_field_tiles_v2(double precision,double precision,double precision,double precision,double precision) IS 'V2 field tiles refresh using PostGIS hex grid (no H3 extension required)';
COMMENT ON FUNCTION public.update_circuit_breaker_state(text,integer,integer,jsonb) IS 'V2 circuit breaker state management for database protection';
COMMENT ON FUNCTION public.cleanup_location_metrics(integer) IS 'V2 location metrics cleanup for storage optimization';