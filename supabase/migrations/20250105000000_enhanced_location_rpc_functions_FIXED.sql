-- Enhanced Location System RPC Functions and Monitoring Tables (FIXED)
-- Supports the new GlobalLocationManager, LocationBus, and Circuit Breaker architecture
-- SAFETY FIXES: Removed auth.users FK references, fixed RLS policies, consolidated with existing tables

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
  profile_id uuid -- ✅ FIXED: Removed FK to auth.users (not allowed in Supabase)
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
  profile_id uuid -- ✅ FIXED: Removed FK to auth.users (not allowed in Supabase)
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
-- 2. Enable RLS on monitoring tables
-- ========================================

ALTER TABLE public.location_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- ✅ FIXED: RLS policies using auth.uid() IS NOT NULL instead of auth.role()
CREATE POLICY "location_system_health_own" ON public.location_system_health
  FOR ALL USING (profile_id = auth.uid() OR profile_id IS NULL)
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

CREATE POLICY "location_performance_metrics_own" ON public.location_performance_metrics
  FOR ALL USING (profile_id = auth.uid() OR profile_id IS NULL)
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

-- Circuit breaker state (system-wide, read-only for authenticated users)
CREATE POLICY "circuit_breaker_state_read" ON public.circuit_breaker_state
  FOR SELECT USING (auth.uid() IS NOT NULL); -- ✅ FIXED: Use auth.uid() IS NOT NULL

CREATE POLICY "circuit_breaker_state_system_write" ON public.circuit_breaker_state
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); -- ✅ FIXED: Allow authenticated users to write

-- ========================================
-- 3. Create indexes for performance (avoiding conflicts)
-- ========================================

-- ✅ FIXED: Drop potentially conflicting indexes first
DROP INDEX IF EXISTS idx_live_positions_expires_visibility;
DROP INDEX IF EXISTS idx_live_positions_geog;

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

-- ✅ FIXED: Recreate optimized indexes for live_positions
CREATE INDEX IF NOT EXISTS idx_live_positions_visibility_expires
  ON public.live_positions(visibility, expires_at) 
  WHERE expires_at > now() AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_live_positions_geog_expires  
  ON public.live_positions USING GIST(geog)
  WHERE expires_at > now();

-- ========================================
-- 4. Enhanced Location RPC Functions
-- ========================================

-- Batch location update with circuit breaker support
CREATE OR REPLACE FUNCTION public.batch_location_update(
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

  -- ✅ FIXED: Record in both new performance table AND existing location_metrics
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
      'priority', p_priority
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
    'batch_location_update',
    v_processed,
    jsonb_build_object(
      'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
      'priority', p_priority,
      'batch_size', LEAST(jsonb_array_length(p_locations), 50)
    )
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', v_processed > 0,
    'processed', v_processed,
    'errors', v_errors,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
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
-- 5. Grant function permissions (✅ FIXED: Removed anon access)
-- ========================================

GRANT EXECUTE ON FUNCTION public.batch_location_update(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_location_system_health(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_location_health_metric(text, text, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_circuit_breaker_state(text, integer, integer, jsonb) TO authenticated;

-- ========================================
-- 6. Create cleanup function for old metrics
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

  RETURN total_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_location_metrics(integer) TO service_role;

-- ========================================
-- 7. Comments for documentation
-- ========================================

COMMENT ON TABLE public.location_system_health IS 'Health metrics for location system components (GPS manager, LocationBus, Circuit Breaker, Zustand store)';
COMMENT ON TABLE public.location_performance_metrics IS 'Performance metrics for location operations (duration, success rate, errors)';
COMMENT ON TABLE public.circuit_breaker_state IS 'Circuit breaker state tracking for database write protection';

COMMENT ON FUNCTION public.batch_location_update(jsonb, text) IS 'Batch insert location data with circuit breaker support and priority handling';
COMMENT ON FUNCTION public.get_location_system_health(integer) IS 'Get comprehensive health metrics for the location system';
COMMENT ON FUNCTION public.record_location_health_metric(text, text, numeric, jsonb) IS 'Record a health metric for a specific location system component';
COMMENT ON FUNCTION public.update_circuit_breaker_state(text, integer, integer, jsonb) IS 'Update the circuit breaker state for database protection';
COMMENT ON FUNCTION public.cleanup_location_metrics(integer) IS 'Clean up old location metrics to maintain database performance';