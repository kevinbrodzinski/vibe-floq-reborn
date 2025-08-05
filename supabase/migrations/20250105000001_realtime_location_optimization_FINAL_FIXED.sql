-- Real-time Location Optimization and Field Tiles Integration (FINAL FIXED)
-- Enhanced presence system with geofencing, venue detection, and spatial optimization
-- CRITICAL FIXES: presence h3_idx/geohash6 population, column name alignment, composite indexes
-- V2 LOCATION STACK: Hybrid H3/Geohash strategy with proper presence spatial indexing

-- ========================================
-- 1. Add missing columns to existing tables (if needed)
-- ========================================

-- FIXED: Ensure presence and vibes_now have lat/lng columns for compatibility
-- These are generated columns from the location geography column
ALTER TABLE public.presence
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

-- ========================================
-- 2. Create composite indexes for hot query paths (CRITICAL FIX)
-- ========================================

-- FIXED: Composite hot-path index for presence neighbor lookup
CREATE INDEX IF NOT EXISTS idx_presence_geohash6_updated
  ON public.presence (geohash6, updated_at DESC) WHERE geohash6 IS NOT NULL;

-- FIXED: Composite index for vibes_now spatial queries
CREATE INDEX IF NOT EXISTS idx_vibes_now_geohash6_updated
  ON public.vibes_now (geohash6, updated_at DESC) WHERE geohash6 IS NOT NULL;

-- H3 indexes for fast neighbor queries (if columns exist)
CREATE INDEX IF NOT EXISTS idx_presence_h3_idx_updated
  ON public.presence (h3_idx, updated_at DESC) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vibes_now_h3_idx_updated
  ON public.vibes_now (h3_idx, updated_at DESC) WHERE h3_idx IS NOT NULL;

-- ========================================
-- 3. Enhanced Real-time Presence Functions (V2 Strategy)
-- ========================================

-- FIXED: Upsert presence with proper h3_idx/geohash6 population (V2)
CREATE OR REPLACE FUNCTION public.upsert_presence_realtime_v2(
  p_lat double precision,
  p_lng double precision,
  p_vibe text DEFAULT 'social',
  p_accuracy double precision DEFAULT 10.0,
  p_h3_idx bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time timestamp := clock_timestamp();
  v_profile_id uuid := auth.uid();
  v_location geography;
  v_geohash6 text;
  v_result jsonb;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for presence updates';
  END IF;

  -- Create location geography
  v_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  
  -- Compute geohash6 server-side for fallback queries
  v_geohash6 := ST_GeoHash(ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326), 6);

  -- FIXED: Insert/update presence with spatial indexes populated
  INSERT INTO public.presence (
    profile_id,
    location,
    lat,           -- FIXED: Populate lat column
    lng,           -- FIXED: Populate lng column
    vibe,
    accuracy_m,
    h3_idx,        -- FIXED: Store client-computed H3 index
    geohash6,      -- FIXED: Store server-computed geohash
    updated_at
  ) VALUES (
    v_profile_id,
    v_location,
    p_lat,         -- FIXED: Direct lat value
    p_lng,         -- FIXED: Direct lng value
    p_vibe::vibe_enum,
    p_accuracy,
    p_h3_idx,      -- FIXED: Client-computed H3 index
    v_geohash6,    -- FIXED: Server-computed geohash
    now()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    location = EXCLUDED.location,
    lat = EXCLUDED.lat,                    -- FIXED: Update lat
    lng = EXCLUDED.lng,                    -- FIXED: Update lng
    vibe = EXCLUDED.vibe,
    accuracy_m = EXCLUDED.accuracy_m,
    h3_idx = EXCLUDED.h3_idx,              -- FIXED: Update H3 index
    geohash6 = EXCLUDED.geohash6,          -- FIXED: Update geohash
    updated_at = EXCLUDED.updated_at;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'presence_update_v2',
    EXTRACT(milliseconds FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'vibe', p_vibe,
      'accuracy', p_accuracy,
      'spatial_strategy', CASE 
        WHEN p_h3_idx IS NOT NULL THEN 'h3_hybrid'
        ELSE 'geohash6_fallback'
      END,
      'has_h3_index', p_h3_idx IS NOT NULL,
      'geohash6', v_geohash6
    ),
    v_profile_id
  );

  v_result := jsonb_build_object(
    'success', true,
    'duration_ms', EXTRACT(milliseconds FROM clock_timestamp() - v_start_time),
    'spatial_strategy', CASE 
      WHEN p_h3_idx IS NOT NULL THEN 'h3_hybrid'
      ELSE 'geohash6_fallback'
    END,
    'geohash6', v_geohash6,
    'h3_idx', p_h3_idx
  );

  RETURN v_result;
END;
$$;

-- FIXED: Get nearby users with hybrid spatial strategy (V2)
CREATE OR REPLACE FUNCTION public.get_nearby_users_v2(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision DEFAULT 1000.0,
  p_h3_ring_ids bigint[] DEFAULT NULL,
  p_geohash6_prefix text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time timestamp := clock_timestamp();
  v_center_point geography;
  v_geohash6 text;
  v_strategy text := 'postgis_fallback';
  v_users jsonb;
  v_count integer;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  v_center_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  v_geohash6 := ST_GeoHash(ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326), 6);

  -- Strategy 1: H3 kRing lookup (fastest, if available)
  IF p_h3_ring_ids IS NOT NULL AND array_length(p_h3_ring_ids, 1) > 0 THEN
    v_strategy := 'h3_kring';
    
    SELECT jsonb_agg(
      jsonb_build_object(
        'profile_id', p.profile_id,
        'lat', p.lat,
        'lng', p.lng,
        'vibe', p.vibe,
        'distance_meters', ST_Distance(p.location, v_center_point),
        'accuracy_m', p.accuracy_m,
        'updated_at', p.updated_at
      )
    ), COUNT(*)
    INTO v_users, v_count
    FROM public.presence p
    WHERE p.h3_idx = ANY(p_h3_ring_ids)
      AND p.updated_at > now() - interval '5 minutes'
      AND p.profile_id != auth.uid()
      AND ST_DWithin(p.location, v_center_point, p_radius_meters)
    ORDER BY ST_Distance(p.location, v_center_point)
    LIMIT p_limit;

  -- Strategy 2: Geohash prefix lookup (fast, broader coverage)
  ELSIF p_geohash6_prefix IS NOT NULL THEN
    v_strategy := 'geohash6_prefix';
    
    SELECT jsonb_agg(
      jsonb_build_object(
        'profile_id', p.profile_id,
        'lat', p.lat,
        'lng', p.lng,
        'vibe', p.vibe,
        'distance_meters', ST_Distance(p.location, v_center_point),
        'accuracy_m', p.accuracy_m,
        'updated_at', p.updated_at
      )
    ), COUNT(*)
    INTO v_users, v_count
    FROM public.presence p
    WHERE p.geohash6 LIKE p_geohash6_prefix || '%'
      AND p.updated_at > now() - interval '5 minutes'
      AND p.profile_id != auth.uid()
      AND ST_DWithin(p.location, v_center_point, p_radius_meters)
    ORDER BY ST_Distance(p.location, v_center_point)
    LIMIT p_limit;

  -- Strategy 3: PostGIS spatial index fallback (reliable, slower)
  ELSE
    v_strategy := 'postgis_spatial';
    
    SELECT jsonb_agg(
      jsonb_build_object(
        'profile_id', p.profile_id,
        'lat', p.lat,
        'lng', p.lng,
        'vibe', p.vibe,
        'distance_meters', ST_Distance(p.location, v_center_point),
        'accuracy_m', p.accuracy_m,
        'updated_at', p.updated_at
      )
    ), COUNT(*)
    INTO v_users, v_count
    FROM public.presence p
    WHERE ST_DWithin(p.location, v_center_point, p_radius_meters)
      AND p.updated_at > now() - interval '5 minutes'
      AND p.profile_id != auth.uid()
    ORDER BY ST_Distance(p.location, v_center_point)
    LIMIT p_limit;
  END IF;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'nearby_users_v2',
    EXTRACT(milliseconds FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'strategy', v_strategy,
      'radius_meters', p_radius_meters,
      'results_count', COALESCE(v_count, 0),
      'geohash6', v_geohash6,
      'h3_ring_size', COALESCE(array_length(p_h3_ring_ids, 1), 0)
    ),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'users', COALESCE(v_users, '[]'::jsonb),
    'count', COALESCE(v_count, 0),
    'strategy', v_strategy,
    'duration_ms', EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)
  );
END;
$$;

-- ========================================
-- 4. Enhanced Field Tiles Functions (V2 Strategy)
-- ========================================

-- FIXED: Get field tiles with multiple spatial strategies (V2)
CREATE OR REPLACE FUNCTION public.get_field_tiles_optimized_v2(
  p_bbox_lat_min double precision,
  p_bbox_lat_max double precision,
  p_bbox_lng_min double precision,
  p_bbox_lng_max double precision,
  p_zoom_level integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time timestamp := clock_timestamp();
  v_bbox geometry;
  v_tiles jsonb;
  v_count integer;
  v_strategy text := 'direct_lookup';
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  v_bbox := ST_MakeEnvelope(p_bbox_lng_min, p_bbox_lat_min, 
                           p_bbox_lng_max, p_bbox_lat_max, 4326);

  -- Strategy 1: Direct tile lookup (fastest)
  SELECT jsonb_agg(
    jsonb_build_object(
      'tile_id', ft.tile_id,
      'center_lat', ft.center_lat,
      'center_lng', ft.center_lng,
      'crowd_count', ft.crowd_count,
      'vibe_mix', ft.vibe_mix,
      'last_activity', ft.last_activity,
      'hex_geom', ST_AsGeoJSON(ft.hex_geom)::jsonb
    )
  ), COUNT(*)
  INTO v_tiles, v_count
  FROM public.field_tiles_v2 ft
  WHERE ST_Intersects(ft.hex_geom, v_bbox)
    AND ft.updated_at > now() - interval '1 hour'
    AND ft.crowd_count > 0;

  -- Strategy 2: Bbox spatial query if no tiles found
  IF v_count = 0 OR v_count IS NULL THEN
    v_strategy := 'bbox_spatial';
    
    -- Generate tiles on-the-fly for the requested area
    WITH hex_tiles AS (
      SELECT 
        'temp_' || row_number() OVER () as tile_id,
        ST_Y(ST_Centroid(hex_geom)) as center_lat,
        ST_X(ST_Centroid(hex_geom)) as center_lng,
        COUNT(vn.profile_id) as crowd_count,
        jsonb_object_agg(vn.vibe, COUNT(vn.*))
          FILTER (WHERE vn.vibe IS NOT NULL) as vibe_mix,
        MAX(vn.updated_at) as last_activity,
        hex_geom
      FROM (
        -- Simple grid generation for small areas
        SELECT ST_Buffer(
          ST_SetSRID(ST_MakePoint(
            p_bbox_lng_min + (i * 0.005),  -- ~500m grid
            p_bbox_lat_min + (j * 0.005)
          ), 4326),
          0.002  -- ~200m radius
        ) as hex_geom
        FROM generate_series(0, LEAST(CEIL((p_bbox_lng_max - p_bbox_lng_min) / 0.005)::int, 20)) i,
             generate_series(0, LEAST(CEIL((p_bbox_lat_max - p_bbox_lat_min) / 0.005)::int, 20)) j
      ) grid
      LEFT JOIN public.vibes_now vn 
        ON ST_Intersects(vn.location::geometry, hex_geom)
       AND vn.updated_at > now() - interval '15 minutes'
      GROUP BY hex_geom
      HAVING COUNT(vn.profile_id) > 0
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'tile_id', tile_id,
        'center_lat', center_lat,
        'center_lng', center_lng,
        'crowd_count', crowd_count,
        'vibe_mix', COALESCE(vibe_mix, '{}'::jsonb),
        'last_activity', last_activity,
        'hex_geom', ST_AsGeoJSON(hex_geom)::jsonb
      )
    ), COUNT(*)
    INTO v_tiles, v_count
    FROM hex_tiles;
  END IF;

  -- Strategy 3: Recent active users fallback
  IF v_count = 0 OR v_count IS NULL THEN
    v_strategy := 'recent_active';
    
    SELECT jsonb_agg(
      jsonb_build_object(
        'tile_id', 'active_' || p.profile_id,
        'center_lat', p.lat,
        'center_lng', p.lng,
        'crowd_count', 1,
        'vibe_mix', jsonb_build_object(p.vibe, 1),
        'last_activity', p.updated_at
      )
    ), COUNT(*)
    INTO v_tiles, v_count
    FROM public.presence p
    WHERE ST_Contains(v_bbox, p.location::geometry)
      AND p.updated_at > now() - interval '5 minutes'
    LIMIT 50;
  END IF;

  RETURN jsonb_build_object(
    'tiles', COALESCE(v_tiles, '[]'::jsonb),
    'count', COALESCE(v_count, 0),
    'strategy', v_strategy,
    'duration_ms', EXTRACT(milliseconds FROM clock_timestamp() - v_start_time)
  );
END;
$$;

-- Smart field tiles refresh with load management (V2)
CREATE OR REPLACE FUNCTION public.refresh_field_tiles_smart_v2(
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
  v_result jsonb;
  v_last_refresh timestamp;
  v_active_users integer;
BEGIN
  -- Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  -- Check if refresh is needed (rate limiting)
  SELECT MAX(updated_at) INTO v_last_refresh
  FROM public.field_tiles_v2;
  
  IF v_last_refresh > now() - interval '30 seconds' THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'rate_limited',
      'last_refresh', v_last_refresh
    );
  END IF;

  -- Check current load
  SELECT COUNT(*) INTO v_active_users
  FROM public.presence
  WHERE updated_at > now() - interval '5 minutes';

  -- Adjust refresh area based on load
  IF v_active_users > 100 THEN
    -- High load: smaller refresh area
    IF p_bbox_lat_min IS NULL THEN
      -- Default to smaller LA area
      SELECT public.refresh_field_tiles_v2(
        300.0,  -- Smaller hex size
        33.9, 34.1,   -- Smaller bbox
        -118.3, -118.1
      ) INTO v_result;
    ELSE
      SELECT public.refresh_field_tiles_v2(
        300.0,  -- Smaller hex size
        p_bbox_lat_min, p_bbox_lat_max,
        p_bbox_lng_min, p_bbox_lng_max
      ) INTO v_result;
    END IF;
  ELSE
    -- Normal load: standard refresh
    SELECT public.refresh_field_tiles_v2(
      500.0,  -- Standard hex size
      p_bbox_lat_min, p_bbox_lat_max,
      p_bbox_lng_min, p_bbox_lng_max
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- ========================================
-- 5. Function Ownership and Permissions (CRITICAL FIX)
-- ========================================

-- Ensure all SECURITY DEFINER functions are owned by postgres
ALTER FUNCTION public.upsert_presence_realtime_v2(double precision,double precision,text,double precision,bigint) OWNER TO postgres;
ALTER FUNCTION public.get_nearby_users_v2(double precision,double precision,double precision,bigint[],text,integer) OWNER TO postgres;
ALTER FUNCTION public.get_field_tiles_optimized_v2(double precision,double precision,double precision,double precision,integer) OWNER TO postgres;
ALTER FUNCTION public.refresh_field_tiles_smart_v2(double precision,double precision,double precision,double precision) OWNER TO postgres;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.upsert_presence_realtime_v2(double precision,double precision,text,double precision,bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_users_v2(double precision,double precision,double precision,bigint[],text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_field_tiles_optimized_v2(double precision,double precision,double precision,double precision,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_field_tiles_smart_v2(double precision,double precision,double precision,double precision) TO service_role;

-- ========================================
-- 6. Comments and Documentation
-- ========================================

COMMENT ON FUNCTION public.upsert_presence_realtime_v2(double precision,double precision,text,double precision,bigint) IS 'V2 real-time presence update with hybrid H3/geohash spatial indexing';
COMMENT ON FUNCTION public.get_nearby_users_v2(double precision,double precision,double precision,bigint[],text,integer) IS 'V2 nearby users query with hierarchical spatial strategies (H3 → geohash → PostGIS)';
COMMENT ON FUNCTION public.get_field_tiles_optimized_v2(double precision,double precision,double precision,double precision,integer) IS 'V2 field tiles query with multiple fallback strategies';
COMMENT ON FUNCTION public.refresh_field_tiles_smart_v2(double precision,double precision,double precision,double precision) IS 'V2 smart field tiles refresh with load-based optimization';