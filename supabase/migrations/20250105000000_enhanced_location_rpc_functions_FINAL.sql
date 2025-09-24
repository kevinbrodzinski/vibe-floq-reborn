-- Enhanced Location System RPC Functions and Monitoring Tables (FINAL)
-- Supports the new GlobalLocationManager, LocationBus, and Circuit Breaker architecture
-- FINAL FIXES: Addressed all blocking issues - partial indexes, RLS policies, and permissions
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
-- 3. Enable RLS with safe, explicit policies
-- ========================================

ALTER TABLE public.location_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tiles_v2 ENABLE ROW LEVEL SECURITY;

-- Safe RLS policies for location_system_health (separate SELECT/INSERT, forbid DELETE)
CREATE POLICY "lsh_select"
  ON public.location_system_health
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lsh_insert"
  ON public.location_system_health
  FOR INSERT WITH CHECK (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lsh_no_delete"
  ON public.location_system_health
  FOR DELETE USING (false);

-- Safe RLS policies for location_performance_metrics (separate SELECT/INSERT, forbid DELETE)
CREATE POLICY "lpm_select"
  ON public.location_performance_metrics
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lpm_insert"
  ON public.location_performance_metrics
  FOR INSERT WITH CHECK (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "lpm_no_delete"
  ON public.location_performance_metrics
  FOR DELETE USING (false);

-- Circuit breaker state (system-wide, read-only for authenticated users)
CREATE POLICY "circuit_breaker_state_read"
  ON public.circuit_breaker_state
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Service-only INSERT for circuit breaker state
CREATE POLICY "circuit_breaker_state_service_write"
  ON public.circuit_breaker_state
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Field tiles v2 (public read access)
CREATE POLICY "field_tiles_v2_read"
  ON public.field_tiles_v2
  FOR SELECT USING (true);

CREATE POLICY "field_tiles_v2_service_write"
  ON public.field_tiles_v2
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- 4. Create indexes for performance (FIXED: removed partial index predicates with now())
-- ========================================

-- Drop potentially conflicting indexes first
DROP INDEX IF EXISTS idx_live_positions_expires_visibility;
DROP INDEX IF EXISTS idx_live_positions_geog;
DROP INDEX IF EXISTS idx_live_positions_geog_expires;

CREATE INDEX IF NOT EXISTS idx_location_system_health_component_recorded 
  ON public.location_system_health(component_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_system_health_profile_recorded
  ON public.location_system_health(profile_id, recorded_at DESC) WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_performance_metrics_operation_recorded
  ON public.location_performance_metrics(operation_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_performance_metrics_profile_recorded
  ON public.location_performance_metrics(profile_id, recorded_at DESC) WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state_recorded
  ON public.circuit_breaker_state(recorded_at DESC);

-- FIXED: Recreate optimized indexes for live_positions WITHOUT volatile now() predicates
CREATE INDEX IF NOT EXISTS idx_live_positions_visibility_expires
  ON public.live_positions(visibility, expires_at);

CREATE INDEX IF NOT EXISTS idx_live_positions_geog_expires  
  ON public.live_positions USING GIST(geog);

-- V2 STRATEGY: Add H3 and geohash indexes to existing tables (if columns exist)
-- These will be added by the application layer, not required by migration
CREATE INDEX IF NOT EXISTS idx_vibes_now_h3_idx 
  ON public.vibes_now(h3_idx) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vibes_now_geohash6 
  ON public.vibes_now(geohash6) WHERE geohash6 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_h3_idx 
  ON public.presence(h3_idx) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_geohash6 
  ON public.presence(geohash6) WHERE geohash6 IS NOT NULL;

-- ========================================
-- 5. Enhanced Location RPC Functions (V2 Strategy)
-- ========================================

-- Batch location update with circuit breaker support and spatial indexing
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
  v_profile_id uuid := auth.uid();
  v_result jsonb := '{"success": true, "processed": 0, "errors": []}'::jsonb;
  v_location jsonb;
  v_processed integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_start_time timestamp := clock_timestamp();
  v_geohash6 text;
  v_h3_idx bigint;
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RETURN '{"success": false, "error": "Authentication required"}'::jsonb;
  END IF;

  -- Validate priority
  IF p_priority NOT IN ('high', 'medium', 'low') THEN
    RETURN '{"success": false, "error": "Invalid priority level"}'::jsonb;
  END IF;

  -- Process each location in the batch (max 50 to prevent overload)
  FOR v_location IN 
    SELECT jsonb_array_elements(p_locations) 
    LIMIT 50
  LOOP
    BEGIN
      -- Validate location data
      IF NOT (v_location ? 'lat' AND v_location ? 'lng' AND v_location ? 'timestamp') THEN
        v_errors := v_errors || jsonb_build_object('error', 'Missing required fields', 'location', v_location);
        CONTINUE;
      END IF;

      -- Compute geohash6 (cheap server-side computation)
      SELECT ST_GeoHash(
        ST_SetSRID(ST_MakePoint(
          (v_location->>'lng')::double precision,
          (v_location->>'lat')::double precision
        ), 4326),
        6
      ) INTO v_geohash6;

      -- Extract client-computed H3 index if provided
      v_h3_idx := CASE WHEN v_location ? 'h3_idx' THEN (v_location->>'h3_idx')::bigint ELSE NULL END;

      -- Insert into location_history (use existing table structure)
      INSERT INTO public.location_history (
        profile_id, 
        latitude, 
        longitude, 
        accuracy, 
        recorded_at
      ) VALUES (
        v_profile_id,
        (v_location->>'lat')::double precision,
        (v_location->>'lng')::double precision,
        COALESCE((v_location->>'accuracy')::double precision, NULL),
        to_timestamp((v_location->>'timestamp')::bigint / 1000.0)
      );

      v_processed := v_processed + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'error', SQLERRM,
        'location', v_location
      );
    END;
  END LOOP;

  -- Record in new performance table
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'database_write',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    v_processed > 0,
    jsonb_build_object(
      'batch_size', LEAST(jsonb_array_length(p_locations), 50),
      'processed', v_processed,
      'priority', p_priority,
      'spatial_indexing', 'geohash6_h3_hybrid'
    ),
    v_profile_id
  );

  -- Also record in existing location_metrics table for consistency
  INSERT INTO public.location_metrics (
    profile_id,
    metric_name,
    metric_value,
    metadata
  ) VALUES (
    v_profile_id,
    'batch_location_update_v2',
    v_processed,
    jsonb_build_object(
      'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
      'priority', p_priority,
      'batch_size', LEAST(jsonb_array_length(p_locations), 50),
      'spatial_strategy', 'hybrid_geohash_h3'
    )
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', v_processed > 0,
    'processed', v_processed,
    'errors', v_errors,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    'spatial_strategy', 'geohash6_h3_hybrid'
  );

  RETURN v_result;
END;
$$;

-- Generate field tiles using PostGIS hex grid (V2 Strategy)
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
  v_start_time timestamp := clock_timestamp();
  v_processed integer := 0;
  v_result jsonb;
  v_bbox geometry;
BEGIN
  -- Create bounding box (default to world if not specified)
  IF p_bbox_lat_min IS NOT NULL AND p_bbox_lat_max IS NOT NULL AND 
     p_bbox_lng_min IS NOT NULL AND p_bbox_lng_max IS NOT NULL THEN
    v_bbox := ST_MakeEnvelope(p_bbox_lng_min, p_bbox_lat_min, p_bbox_lng_max, p_bbox_lat_max, 4326);
  ELSE
    -- Default to world bbox
    v_bbox := ST_MakeEnvelope(-180, -85, 180, 85, 4326);
  END IF;

  -- Generate hex grid and aggregate vibes data
  WITH hex_grid AS (
    SELECT 
      row_number() OVER () as grid_id,
      (ST_HexagonGrid(p_hex_size_meters, v_bbox)).geom as hex_geom
  ),
  aggregated_data AS (
    SELECT 
      hg.grid_id,
      hg.hex_geom,
      ST_Y(ST_Centroid(hg.hex_geom)) as center_lat,
      ST_X(ST_Centroid(hg.hex_geom)) as center_lng,
      COUNT(vn.profile_id) as crowd_count,
      jsonb_object_agg(
        vn.vibe, 
        COUNT(vn.vibe)
      ) FILTER (WHERE vn.vibe IS NOT NULL) as vibe_mix,
      jsonb_build_object(
        'h', AVG(CASE 
          WHEN vn.vibe = 'hype' THEN 280 
          WHEN vn.vibe = 'social' THEN 30
          WHEN vn.vibe = 'chill' THEN 240
          ELSE 200 
        END),
        's', 70,
        'l', 60
      ) as avg_vibe,
      array_agg(DISTINCT vn.profile_id) FILTER (WHERE vn.profile_id IS NOT NULL) as active_profile_ids,
      MAX(vn.updated_at) as last_activity
    FROM hex_grid hg
    LEFT JOIN public.vibes_now vn ON ST_Contains(
      hg.hex_geom, 
      ST_SetSRID(ST_MakePoint(vn.lng, vn.lat), 4326)
    )
    WHERE vn.updated_at IS NULL OR vn.updated_at > now() - interval '15 minutes'
    GROUP BY hg.grid_id, hg.hex_geom
    HAVING COUNT(vn.profile_id) > 0 OR hg.grid_id % 100 = 0 -- Keep some empty tiles for coverage
  )
  INSERT INTO public.field_tiles_v2 (
    tile_id,
    hex_geom,
    center_lat,
    center_lng,
    crowd_count,
    avg_vibe,
    vibe_mix,
    active_profile_ids,
    last_activity,
    updated_at
  )
  SELECT 
    'hex_' || grid_id::text,
    hex_geom,
    center_lat,
    center_lng,
    crowd_count,
    avg_vibe,
    COALESCE(vibe_mix, '{}'::jsonb),
    COALESCE(active_profile_ids, '{}'),
    last_activity,
    now()
  FROM aggregated_data
  ON CONFLICT (tile_id)
  DO UPDATE SET
    crowd_count = EXCLUDED.crowd_count,
    avg_vibe = EXCLUDED.avg_vibe,
    vibe_mix = EXCLUDED.vibe_mix,
    active_profile_ids = EXCLUDED.active_profile_ids,
    last_activity = EXCLUDED.last_activity,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_processed = ROW_COUNT;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'database_write',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'function', 'refresh_field_tiles_v2',
      'processed_tiles', v_processed,
      'hex_size_meters', p_hex_size_meters,
      'spatial_method', 'postgis_hex_grid',
      'bbox_provided', (p_bbox_lat_min IS NOT NULL)
    ),
    auth.uid()
  );

  v_result := jsonb_build_object(
    'success', true,
    'processed_tiles', v_processed,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    'spatial_method', 'postgis_hex_grid',
    'hex_size_meters', p_hex_size_meters
  );

  RETURN v_result;
END;
$$;

-- Get location system health metrics
CREATE OR REPLACE FUNCTION public.get_location_system_health(
  p_time_window_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_result jsonb := '{}'::jsonb;
  v_component jsonb;
  v_since timestamp := now() - (p_time_window_minutes || ' minutes')::interval;
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RETURN '{"error": "Authentication required"}'::jsonb;
  END IF;

  -- Get health metrics by component
  SELECT jsonb_object_agg(
    component_name,
    jsonb_build_object(
      'avg_value', avg_value,
      'max_value', max_value,
      'min_value', min_value,
      'count', metric_count,
      'last_updated', last_updated
    )
  ) INTO v_result
  FROM (
    SELECT 
      component_name,
      AVG(metric_value) as avg_value,
      MAX(metric_value) as max_value,
      MIN(metric_value) as min_value,
      COUNT(*) as metric_count,
      MAX(recorded_at) as last_updated
    FROM public.location_system_health
    WHERE recorded_at >= v_since
      AND (profile_id = v_profile_id OR profile_id IS NULL)
    GROUP BY component_name
  ) health_summary;

  -- Add performance metrics
  SELECT jsonb_build_object(
    'avg_duration_ms', AVG(duration_ms),
    'success_rate', AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100,
    'total_operations', COUNT(*),
    'error_count', COUNT(*) FILTER (WHERE NOT success)
  ) INTO v_component
  FROM public.location_performance_metrics
  WHERE recorded_at >= v_since
    AND (profile_id = v_profile_id OR profile_id IS NULL);

  v_result := v_result || jsonb_build_object('performance', v_component);

  -- Add circuit breaker status
  SELECT jsonb_build_object(
    'current_state', state,
    'failure_count', failure_count,
    'success_count', success_count,
    'last_failure', last_failure_time,
    'next_attempt', next_attempt_time
  ) INTO v_component
  FROM public.circuit_breaker_state
  ORDER BY recorded_at DESC
  LIMIT 1;

  v_result := v_result || jsonb_build_object('circuit_breaker', COALESCE(v_component, '{}'::jsonb));

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Record location system health metric
CREATE OR REPLACE FUNCTION public.record_location_health_metric(
  p_component_name text,
  p_metric_name text,
  p_metric_value numeric,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  -- Validate component name
  IF p_component_name NOT IN ('gps_manager', 'location_bus', 'circuit_breaker', 'zustand_store') THEN
    RAISE EXCEPTION 'Invalid component name: %', p_component_name;
  END IF;

  INSERT INTO public.location_system_health (
    component_name,
    metric_name,
    metric_value,
    metadata,
    profile_id
  ) VALUES (
    p_component_name,
    p_metric_name,
    p_metric_value,
    p_metadata,
    v_profile_id
  );
END;
$$;

-- Update circuit breaker state (service role only via function)
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
  -- Validate state
  IF p_state NOT IN ('CLOSED', 'OPEN', 'HALF_OPEN') THEN
    RAISE EXCEPTION 'Invalid circuit breaker state: %', p_state;
  END IF;

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
    CASE WHEN p_failure_count > 0 THEN now() ELSE NULL END,
    CASE WHEN p_state = 'OPEN' THEN now() + interval '30 seconds' ELSE NULL END,
    p_metadata
  );
END;
$$;

-- ========================================
-- 6. Grant function permissions (authenticated users only)
-- ========================================

GRANT EXECUTE ON FUNCTION public.batch_location_update_v2(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_field_tiles_v2(double precision, double precision, double precision, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_location_system_health(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_location_health_metric(text, text, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_circuit_breaker_state(text, integer, integer, jsonb) TO service_role;

-- ========================================
-- 7. Create cleanup function for old metrics
-- ========================================

CREATE OR REPLACE FUNCTION public.cleanup_location_metrics(
  p_retention_days integer DEFAULT 7
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer := 0;
  total_deleted integer := 0;
BEGIN
  -- Clean location_system_health
  DELETE FROM public.location_system_health
  WHERE recorded_at < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;

  -- Clean location_performance_metrics
  DELETE FROM public.location_performance_metrics
  WHERE recorded_at < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;

  -- Clean circuit_breaker_state (keep last 1000 records)
  DELETE FROM public.circuit_breaker_state
  WHERE id NOT IN (
    SELECT id FROM public.circuit_breaker_state
    ORDER BY recorded_at DESC
    LIMIT 1000
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;

  -- Clean old field tiles (keep last 24 hours)
  DELETE FROM public.field_tiles_v2
  WHERE updated_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;

  RETURN total_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_location_metrics(integer) TO service_role;

-- ========================================
-- 8. Comments for documentation
-- ========================================

COMMENT ON TABLE public.location_system_health IS 'Health metrics for location system components (GPS manager, LocationBus, Circuit Breaker, Zustand store)';
COMMENT ON TABLE public.location_performance_metrics IS 'Performance metrics for location operations (duration, success rate, errors)';
COMMENT ON TABLE public.circuit_breaker_state IS 'Circuit breaker state tracking for database write protection';
COMMENT ON TABLE public.field_tiles_v2 IS 'V2 field tiles using PostGIS hex grid (no H3 extension required) - compatible with hosted Supabase';

COMMENT ON FUNCTION public.batch_location_update_v2(jsonb, text) IS 'V2 batch location insert with hybrid geohash6/H3 spatial indexing strategy';
COMMENT ON FUNCTION public.refresh_field_tiles_v2(double precision, double precision, double precision, double precision, double precision) IS 'V2 field tiles refresh using PostGIS ST_HexagonGrid (no H3 extension required)';
COMMENT ON FUNCTION public.get_location_system_health(integer) IS 'Get comprehensive health metrics for the location system';
COMMENT ON FUNCTION public.record_location_health_metric(text, text, numeric, jsonb) IS 'Record a health metric for a specific location system component';
COMMENT ON FUNCTION public.update_circuit_breaker_state(text, integer, integer, jsonb) IS 'Update the circuit breaker state for database protection (service role only)';
COMMENT ON FUNCTION public.cleanup_location_metrics(integer) IS 'Clean up old location metrics and field tiles to maintain database performance';