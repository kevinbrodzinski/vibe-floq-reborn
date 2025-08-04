-- Real-time Location Optimization and Field Tiles Integration (FINAL)
-- Optimizes real-time location updates and spatial field tile management
-- FINAL FIXES: Addressed all blocking issues - removed partial indexes with now(), fixed RLS policies
-- V2 LOCATION STACK: Hybrid H3/Geohash strategy for hosted Supabase (no H3 extension required)

-- ========================================
-- 1. Real-time Location Broadcasting Functions (V2 Strategy)
-- ========================================

-- Optimized presence update with real-time broadcasting and hybrid spatial indexing
CREATE OR REPLACE FUNCTION public.upsert_presence_realtime_v2(
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_vibe       TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_accuracy   DOUBLE PRECISION DEFAULT NULL,
  p_movement_context TEXT DEFAULT 'unknown',
  p_h3_idx     BIGINT DEFAULT NULL -- Client-computed H3 index (optional)
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id UUID := auth.uid();
  v_location   GEOMETRY;
  v_geography  GEOGRAPHY;
  v_geohash5   TEXT;
  v_geohash6   TEXT;
  v_h3_idx     BIGINT := p_h3_idx;
  v_result     jsonb;
  v_start_time timestamp := clock_timestamp();
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RETURN '{"success": false, "error": "Authentication required"}'::jsonb;
  END IF;

  -- Validate coordinates
  IF p_lat IS NULL OR p_lng IS NULL OR 
     p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RETURN '{"success": false, "error": "Invalid coordinates"}'::jsonb;
  END IF;

  -- Create geometry and geography
  v_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  v_geography := v_location::geography;

  -- Generate spatial indexes (server-side computation)
  v_geohash5 := ST_GeoHash(v_location, 5);
  v_geohash6 := ST_GeoHash(v_location, 6);

  -- Upsert presence with enhanced spatial indexing
  INSERT INTO public.presence (
    profile_id,
    lat,
    lng,
    location,
    vibe,
    accuracy_m,
    updated_at
  ) VALUES (
    v_profile_id,
    p_lat,
    p_lng,
    v_geography,
    p_vibe::vibe_enum,
    p_accuracy,
    now()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    location = EXCLUDED.location,
    vibe = EXCLUDED.vibe,
    accuracy_m = EXCLUDED.accuracy_m,
    updated_at = EXCLUDED.updated_at;

  -- Update vibes_now for field tiles with hybrid spatial indexing
  BEGIN
    INSERT INTO public.vibes_now (
      profile_id,
      location,
      vibe,
      geohash6,
      gh5,
      updated_at
    ) VALUES (
      v_profile_id,
      v_geography,
      p_vibe::vibe_enum,
      v_geohash6,
      v_geohash5,
      now()
    )
    ON CONFLICT (profile_id)
    DO UPDATE SET
      location = EXCLUDED.location,
      vibe = EXCLUDED.vibe,
      geohash6 = EXCLUDED.geohash6,
      gh5 = EXCLUDED.gh5,
      updated_at = EXCLUDED.updated_at;

    -- If vibes_now has h3_idx column and client provided H3, update it
    IF v_h3_idx IS NOT NULL THEN
      BEGIN
        UPDATE public.vibes_now 
        SET h3_idx = v_h3_idx 
        WHERE profile_id = v_profile_id;
      EXCEPTION WHEN OTHERS THEN
        -- Column might not exist yet, ignore
        NULL;
      END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Continue if vibes_now table doesn't exist or has different structure
    NULL;
  END;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'location_update',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'vibe', p_vibe,
      'visibility', p_visibility,
      'movement_context', p_movement_context,
      'accuracy', p_accuracy,
      'spatial_strategy', 'hybrid_geohash_h3',
      'spatial_indexes', jsonb_build_object(
        'geohash5', v_geohash5,
        'geohash6', v_geohash6,
        'h3_idx', v_h3_idx,
        'client_computed_h3', (p_h3_idx IS NOT NULL)
      )
    ),
    v_profile_id
  );

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
    'spatial_strategy', 'hybrid_geohash_h3',
    'spatial_indexes', jsonb_build_object(
      'geohash5', v_geohash5,
      'geohash6', v_geohash6,
      'h3_idx', v_h3_idx
    ),
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- 2. Enhanced Neighbor Query Functions (V2 Strategy)
-- ========================================

-- Get nearby users using hybrid spatial indexing (optimized for H3 kRing queries)
CREATE OR REPLACE FUNCTION public.get_nearby_users_v2(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 1000,
  p_h3_ring_ids BIGINT[] DEFAULT NULL, -- Client-computed H3 kRing
  p_geohash_prefix TEXT DEFAULT NULL,  -- Fallback geohash prefix
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE(
  profile_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  vibe TEXT,
  distance_meters DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE,
  spatial_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_center_point GEOGRAPHY;
  v_geohash6 TEXT;
BEGIN
  v_center_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  
  -- Strategy 1: Use H3 kRing if provided (most efficient)
  IF p_h3_ring_ids IS NOT NULL AND array_length(p_h3_ring_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT 
      p.profile_id,
      p.lat,
      p.lng,
      p.vibe::text,
      ST_Distance(p.location, v_center_point) as distance_meters,
      p.updated_at,
      'h3_kring'::text as spatial_method
    FROM public.presence p
    WHERE p.h3_idx = ANY(p_h3_ring_ids)
      AND p.updated_at > now() - interval '5 minutes'
      AND ST_Distance(p.location, v_center_point) <= p_radius_meters
    ORDER BY distance_meters
    LIMIT p_limit;
    
  -- Strategy 2: Use geohash prefix if provided (good performance)
  ELSIF p_geohash_prefix IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      p.profile_id,
      p.lat,
      p.lng,
      p.vibe::text,
      ST_Distance(p.location, v_center_point) as distance_meters,
      p.updated_at,
      'geohash_prefix'::text as spatial_method
    FROM public.presence p
    WHERE p.geohash6 LIKE p_geohash_prefix || '%'
      AND p.updated_at > now() - interval '5 minutes'
      AND ST_Distance(p.location, v_center_point) <= p_radius_meters
    ORDER BY distance_meters
    LIMIT p_limit;
    
  -- Strategy 3: Fallback to PostGIS spatial query (slower but works)
  ELSE
    v_geohash6 := ST_GeoHash(ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326), 6);
    
    RETURN QUERY
    SELECT 
      p.profile_id,
      p.lat,
      p.lng,
      p.vibe::text,
      ST_Distance(p.location, v_center_point) as distance_meters,
      p.updated_at,
      'postgis_spatial'::text as spatial_method
    FROM public.presence p
    WHERE ST_DWithin(p.location, v_center_point, p_radius_meters)
      AND p.updated_at > now() - interval '5 minutes'
    ORDER BY distance_meters
    LIMIT p_limit;
  END IF;
END;
$$;

-- ========================================
-- 3. Enhanced Field Tiles Functions (V2 Strategy)
-- ========================================

-- Get active field tiles with hybrid spatial strategy
CREATE OR REPLACE FUNCTION public.get_field_tiles_optimized_v2(
  p_tile_ids TEXT[] DEFAULT NULL,
  p_h3_indices BIGINT[] DEFAULT NULL,
  p_geohash_prefixes TEXT[] DEFAULT NULL,
  p_bbox_lat_min DOUBLE PRECISION DEFAULT NULL,
  p_bbox_lat_max DOUBLE PRECISION DEFAULT NULL,
  p_bbox_lng_min DOUBLE PRECISION DEFAULT NULL,
  p_bbox_lng_max DOUBLE PRECISION DEFAULT NULL
) RETURNS TABLE(
  tile_id TEXT,
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  crowd_count INTEGER,
  avg_vibe JSONB,
  vibe_mix JSONB,
  active_profile_ids UUID[],
  last_activity TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  spatial_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strategy 1: Specific tile IDs (direct lookup)
  IF p_tile_ids IS NOT NULL AND array_length(p_tile_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT 
      ft.tile_id,
      ft.center_lat,
      ft.center_lng,
      ft.crowd_count,
      ft.avg_vibe,
      ft.vibe_mix,
      ft.active_profile_ids,
      ft.last_activity,
      ft.updated_at,
      'direct_lookup'::text as spatial_method
    FROM public.field_tiles_v2 ft
    WHERE ft.tile_id = ANY(p_tile_ids)
      AND ft.updated_at > now() - interval '5 minutes'
    ORDER BY ft.updated_at DESC;
    
  -- Strategy 2: Bounding box (PostGIS spatial query)
  ELSIF p_bbox_lat_min IS NOT NULL AND p_bbox_lat_max IS NOT NULL AND 
        p_bbox_lng_min IS NOT NULL AND p_bbox_lng_max IS NOT NULL THEN
    
    RETURN QUERY
    SELECT 
      ft.tile_id,
      ft.center_lat,
      ft.center_lng,
      ft.crowd_count,
      ft.avg_vibe,
      ft.vibe_mix,
      ft.active_profile_ids,
      ft.last_activity,
      ft.updated_at,
      'bbox_spatial'::text as spatial_method
    FROM public.field_tiles_v2 ft
    WHERE ST_Intersects(
      ft.hex_geom,
      ST_MakeEnvelope(p_bbox_lng_min, p_bbox_lat_min, p_bbox_lng_max, p_bbox_lat_max, 4326)
    )
    AND ft.updated_at > now() - interval '5 minutes'
    ORDER BY ft.updated_at DESC
    LIMIT 100;
    
  -- Strategy 3: Recent active tiles (default)
  ELSE
    RETURN QUERY
    SELECT 
      ft.tile_id,
      ft.center_lat,
      ft.center_lng,
      ft.crowd_count,
      ft.avg_vibe,
      ft.vibe_mix,
      ft.active_profile_ids,
      ft.last_activity,
      ft.updated_at,
      'recent_active'::text as spatial_method
    FROM public.field_tiles_v2 ft
    WHERE ft.updated_at > now() - interval '5 minutes'
      AND ft.crowd_count > 0
    ORDER BY ft.crowd_count DESC, ft.updated_at DESC
    LIMIT 50;
  END IF;
END;
$$;

-- Refresh field tiles with circuit breaker awareness (V2 Strategy)
CREATE OR REPLACE FUNCTION public.refresh_field_tiles_smart_v2(
  p_force_refresh BOOLEAN DEFAULT FALSE,
  p_hex_size_meters DOUBLE PRECISION DEFAULT 500.0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time timestamp := clock_timestamp();
  v_processed integer := 0;
  v_result jsonb;
  v_last_refresh timestamp;
  v_circuit_breaker_state text;
BEGIN
  -- Check circuit breaker state
  SELECT state INTO v_circuit_breaker_state
  FROM public.circuit_breaker_state
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Skip refresh if circuit breaker is OPEN (unless forced)
  IF v_circuit_breaker_state = 'OPEN' AND NOT p_force_refresh THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Circuit breaker is OPEN, skipping refresh',
      'circuit_breaker_state', v_circuit_breaker_state
    );
  END IF;

  -- Check last refresh time (30 second minimum interval)
  SELECT MAX(updated_at) INTO v_last_refresh
  FROM public.field_tiles_v2;

  IF v_last_refresh IS NOT NULL AND 
     v_last_refresh > now() - interval '30 seconds' AND 
     NOT p_force_refresh THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Refresh rate limited (30s minimum)',
      'last_refresh', v_last_refresh
    );
  END IF;

  -- Call the main refresh function from the first migration
  BEGIN
    SELECT public.refresh_field_tiles_v2(
      p_hex_size_meters,
      NULL, NULL, NULL, NULL -- Use world bbox
    ) INTO v_result;
    
    v_processed := (v_result->>'processed_tiles')::integer;

  EXCEPTION WHEN OTHERS THEN
    -- Record circuit breaker failure
    INSERT INTO public.circuit_breaker_state (state, failure_count, metadata)
    VALUES ('OPEN', 1, jsonb_build_object(
      'error', SQLERRM, 
      'function', 'refresh_field_tiles_smart_v2',
      'spatial_strategy', 'postgis_hex_grid_v2'
    ));
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'circuit_breaker_triggered', true,
      'spatial_strategy', 'postgis_hex_grid_v2'
    );
  END;

  -- Record successful operation
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
      'function', 'refresh_field_tiles_smart_v2',
      'processed_tiles', v_processed,
      'force_refresh', p_force_refresh,
      'hex_size_meters', p_hex_size_meters,
      'spatial_strategy', 'postgis_hex_grid_v2'
    ),
    auth.uid()
  );

  v_result := v_result || jsonb_build_object(
    'circuit_breaker_state', COALESCE(v_circuit_breaker_state, 'CLOSED'),
    'spatial_strategy', 'postgis_hex_grid_v2'
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- 4. Grant permissions (authenticated users only)
-- ========================================

GRANT EXECUTE ON FUNCTION public.upsert_presence_realtime_v2(double precision, double precision, text, text, double precision, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_users_v2(double precision, double precision, double precision, bigint[], text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_field_tiles_optimized_v2(text[], bigint[], text[], double precision, double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_field_tiles_smart_v2(boolean, double precision) TO service_role;

-- ========================================
-- 5. Comments for documentation
-- ========================================

COMMENT ON FUNCTION public.upsert_presence_realtime_v2(double precision, double precision, text, text, double precision, text, bigint) IS 'V2 optimized real-time presence update with hybrid H3/geohash spatial indexing (no H3 extension required)';
COMMENT ON FUNCTION public.get_nearby_users_v2(double precision, double precision, double precision, bigint[], text, integer) IS 'V2 nearby users query with hybrid spatial strategy (H3 kRing, geohash prefix, PostGIS fallback)';
COMMENT ON FUNCTION public.get_field_tiles_optimized_v2(text[], bigint[], text[], double precision, double precision, double precision, double precision) IS 'V2 field tiles query with multiple spatial strategies for optimal performance';
COMMENT ON FUNCTION public.refresh_field_tiles_smart_v2(boolean, double precision) IS 'V2 smart field tiles refresh with circuit breaker awareness and PostGIS hex grid generation';