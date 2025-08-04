-- Real-time Location Optimization and Field Tiles Integration
-- Optimizes real-time location updates and spatial field tile management

-- ========================================
-- 1. Real-time Location Broadcasting Functions
-- ========================================

-- Optimized presence update with real-time broadcasting
CREATE OR REPLACE FUNCTION public.upsert_presence_realtime(
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_vibe       TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_accuracy   DOUBLE PRECISION DEFAULT NULL,
  p_movement_context TEXT DEFAULT 'unknown'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id UUID := auth.uid();
  v_location   GEOMETRY;
  v_geography  GEOGRAPHY;
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '90 seconds';
  v_result     jsonb;
  v_old_location GEOMETRY;
  v_distance_moved DOUBLE PRECISION := 0;
  v_should_broadcast BOOLEAN := false;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RETURN '{"success": false, "error": "Authentication required"}'::jsonb;
  END IF;

  -- Validate inputs
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN '{"success": false, "error": "Latitude/longitude required"}'::jsonb;
  END IF;
  
  IF p_vibe IS NULL THEN
    RETURN '{"success": false, "error": "Vibe is required"}'::jsonb;
  END IF;
  
  IF p_visibility NOT IN ('public','friends','private') THEN
    RETURN '{"success": false, "error": "Invalid visibility"}'::jsonb;
  END IF;

  -- Create geometry objects
  v_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  v_geography := v_location::geography;

  -- Get previous location to calculate movement
  SELECT location INTO v_old_location
  FROM public.vibes_now
  WHERE profile_id = v_profile_id;

  -- Calculate distance moved
  IF v_old_location IS NOT NULL THEN
    v_distance_moved := ST_Distance(v_old_location::geography, v_geography);
    -- Broadcast if moved more than 10 meters or visibility changed
    v_should_broadcast := v_distance_moved > 10;
  ELSE
    v_should_broadcast := true; -- First location update
  END IF;

  -- Upsert presence
  INSERT INTO public.vibes_now (
    profile_id, location, vibe,
    expires_at, updated_at, visibility)
  VALUES (
    v_profile_id, v_location, p_vibe::public.vibe_enum,
    v_expires_at, NOW(), p_visibility)
  ON CONFLICT (profile_id) DO UPDATE
    SET location   = EXCLUDED.location,
        vibe       = EXCLUDED.vibe,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW(),
        visibility = EXCLUDED.visibility;

  -- Also update live_positions table for real-time queries
  INSERT INTO public.live_positions (
    profile_id, latitude, longitude, accuracy, vibe, visibility,
    last_updated, expires_at)
  VALUES (
    v_profile_id, p_lat, p_lng, p_accuracy, p_vibe, p_visibility,
    NOW(), v_expires_at)
  ON CONFLICT (profile_id) DO UPDATE
    SET latitude     = EXCLUDED.latitude,
        longitude    = EXCLUDED.longitude,
        accuracy     = EXCLUDED.accuracy,
        vibe         = EXCLUDED.vibe,
        visibility   = EXCLUDED.visibility,
        last_updated = NOW(),
        expires_at   = EXCLUDED.expires_at;

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
      'distance_moved', v_distance_moved,
      'should_broadcast', v_should_broadcast,
      'movement_context', p_movement_context,
      'accuracy', p_accuracy
    ),
    v_profile_id
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'distance_moved', v_distance_moved,
    'should_broadcast', v_should_broadcast,
    'expires_at', v_expires_at,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- 2. Field Tiles Optimization Functions
-- ========================================

-- Get optimized field tiles with location clustering
CREATE OR REPLACE FUNCTION public.get_field_tiles_optimized(
  p_west DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_north DOUBLE PRECISION,
  p_zoom_level INTEGER DEFAULT 12,
  p_include_live_positions BOOLEAN DEFAULT true,
  p_include_venues BOOLEAN DEFAULT true,
  p_max_results INTEGER DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bbox GEOMETRY;
  v_result jsonb := '{}'::jsonb;
  v_live_positions jsonb := '[]'::jsonb;
  v_venues jsonb := '[]'::jsonb;
  v_clusters jsonb := '[]'::jsonb;
  v_start_time TIMESTAMP := clock_timestamp();
  v_cluster_distance DOUBLE PRECISION;
BEGIN
  -- Create bounding box
  v_bbox := ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326);
  
  -- Determine cluster distance based on zoom level
  v_cluster_distance := CASE 
    WHEN p_zoom_level >= 16 THEN 50    -- 50m at street level
    WHEN p_zoom_level >= 14 THEN 100   -- 100m at neighborhood level
    WHEN p_zoom_level >= 12 THEN 250   -- 250m at district level
    ELSE 500                           -- 500m at city level
  END;

  -- Get live positions if requested
  IF p_include_live_positions THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', lp.profile_id,
        'lat', lp.latitude,
        'lng', lp.longitude,
        'vibe', lp.vibe,
        'accuracy', lp.accuracy,
        'last_updated', lp.last_updated,
        'type', 'live_position'
      )
    ) INTO v_live_positions
    FROM public.live_positions lp
    WHERE lp.visibility = 'public'
      AND lp.expires_at > now()
      AND ST_Intersects(lp.geog::geometry, v_bbox)
    LIMIT p_max_results / 2;
  END IF;

  -- Get venues if requested with clustering
  IF p_include_venues THEN
    WITH venue_clusters AS (
      SELECT 
        ST_ClusterKMeans(v.geom, LEAST(50, COUNT(*) / 10)) OVER() as cluster_id,
        v.id,
        v.name,
        ST_Y(v.geom::geometry) as lat,
        ST_X(v.geom::geometry) as lng,
        v.categories,
        v.vibe,
        COALESCE(v.live_count, 0) as live_count,
        COALESCE(v.popularity, 0) as popularity
      FROM public.venues v
      WHERE ST_Intersects(v.geom, v_bbox)
        AND v.geom IS NOT NULL
    ),
    clustered_venues AS (
      SELECT 
        cluster_id,
        CASE 
          WHEN COUNT(*) = 1 THEN
            jsonb_build_object(
              'id', MIN(id::text),
              'name', MIN(name),
              'lat', AVG(lat),
              'lng', AVG(lng),
              'categories', MIN(categories),
              'vibe', MIN(vibe),
              'live_count', SUM(live_count),
              'popularity', MAX(popularity),
              'type', 'venue',
              'cluster_size', 1
            )
          ELSE
            jsonb_build_object(
              'id', 'cluster_' || cluster_id,
              'name', COUNT(*) || ' venues',
              'lat', AVG(lat),
              'lng', AVG(lng),
              'categories', array_agg(DISTINCT unnest(categories)),
              'vibe', 'mixed',
              'live_count', SUM(live_count),
              'popularity', MAX(popularity),
              'type', 'venue_cluster',
              'cluster_size', COUNT(*),
              'venue_ids', array_agg(id::text)
            )
        END as venue_data
      FROM venue_clusters
      GROUP BY cluster_id
    )
    SELECT jsonb_agg(venue_data) INTO v_venues
    FROM clustered_venues
    LIMIT p_max_results / 2;
  END IF;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'field_tiles_query',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'bbox', jsonb_build_object('west', p_west, 'south', p_south, 'east', p_east, 'north', p_north),
      'zoom_level', p_zoom_level,
      'cluster_distance', v_cluster_distance,
      'live_positions_count', COALESCE(jsonb_array_length(v_live_positions), 0),
      'venues_count', COALESCE(jsonb_array_length(v_venues), 0)
    ),
    auth.uid()
  );

  -- Build final result
  v_result := jsonb_build_object(
    'live_positions', COALESCE(v_live_positions, '[]'::jsonb),
    'venues', COALESCE(v_venues, '[]'::jsonb),
    'metadata', jsonb_build_object(
      'zoom_level', p_zoom_level,
      'cluster_distance', v_cluster_distance,
      'query_duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
      'bbox', jsonb_build_object('west', p_west, 'south', p_south, 'east', p_east, 'north', p_north)
    )
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- 3. Proximity and Social Discovery Functions
-- ========================================

-- Get nearby users with enhanced filtering
CREATE OR REPLACE FUNCTION public.get_nearby_users_enhanced(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 1000,
  p_include_friends_only BOOLEAN DEFAULT false,
  p_vibe_filter TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id UUID := auth.uid();
  v_center GEOGRAPHY;
  v_result jsonb;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RETURN '{"error": "Authentication required"}'::jsonb;
  END IF;

  -- Create center point
  v_center := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

  -- Query nearby users
  WITH nearby_users AS (
    SELECT 
      lp.profile_id,
      lp.latitude,
      lp.longitude,
      lp.vibe,
      lp.accuracy,
      lp.last_updated,
      ST_Distance(lp.geog, v_center)::double precision as distance_m,
      p.display_name,
      p.avatar_url
    FROM public.live_positions lp
    JOIN public.profiles p ON p.id = lp.profile_id
    WHERE lp.profile_id != v_profile_id
      AND lp.visibility = 'public'
      AND lp.expires_at > now()
      AND ST_DWithin(lp.geog, v_center, p_radius_m)
      AND (p_vibe_filter IS NULL OR lp.vibe = p_vibe_filter)
      AND (
        NOT p_include_friends_only 
        OR EXISTS (
          SELECT 1 FROM public.friends f 
          WHERE (f.profile_id = v_profile_id AND f.friend_id = lp.profile_id)
             OR (f.friend_id = v_profile_id AND f.profile_id = lp.profile_id)
        )
      )
    ORDER BY distance_m
    LIMIT p_limit
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'profile_id', profile_id,
      'display_name', display_name,
      'avatar_url', avatar_url,
      'lat', latitude,
      'lng', longitude,
      'vibe', vibe,
      'accuracy', accuracy,
      'distance_m', distance_m,
      'last_updated', last_updated
    )
  ) INTO v_result
  FROM nearby_users;

  -- Record performance metrics
  INSERT INTO public.location_performance_metrics (
    operation_type,
    duration_ms,
    success,
    metadata,
    profile_id
  ) VALUES (
    'proximity_query',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time),
    true,
    jsonb_build_object(
      'radius_m', p_radius_m,
      'friends_only', p_include_friends_only,
      'vibe_filter', p_vibe_filter,
      'results_count', COALESCE(jsonb_array_length(v_result), 0)
    ),
    v_profile_id
  );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ========================================
-- 4. Location Intelligence Functions
-- ========================================

-- Get location movement patterns and insights
CREATE OR REPLACE FUNCTION public.get_location_insights(
  p_days_back INTEGER DEFAULT 7,
  p_min_accuracy DOUBLE PRECISION DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id UUID := auth.uid();
  v_result jsonb := '{}'::jsonb;
  v_since TIMESTAMP := now() - (p_days_back || ' days')::interval;
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RETURN '{"error": "Authentication required"}'::jsonb;
  END IF;

  -- Get movement statistics
  WITH movement_stats AS (
    SELECT 
      COUNT(*) as total_points,
      AVG(accuracy) as avg_accuracy,
      MIN(recorded_at) as first_location,
      MAX(recorded_at) as last_location,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(MIN(longitude), MIN(latitude)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(MAX(longitude), MAX(latitude)), 4326)::geography
      ) as max_distance,
      -- Calculate total distance traveled (approximate)
      SUM(
        CASE 
          WHEN LAG(latitude) OVER (ORDER BY recorded_at) IS NOT NULL THEN
            ST_Distance(
              ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(
                LAG(longitude) OVER (ORDER BY recorded_at),
                LAG(latitude) OVER (ORDER BY recorded_at)
              ), 4326)::geography
            )
          ELSE 0
        END
      ) as total_distance_m
    FROM public.location_history
    WHERE profile_id = v_profile_id
      AND recorded_at >= v_since
      AND (accuracy IS NULL OR accuracy <= p_min_accuracy)
  ),
  venue_visits AS (
    SELECT 
      COUNT(DISTINCT venue_id) as unique_venues,
      COUNT(*) as total_visits,
      AVG(distance_m) as avg_venue_distance
    FROM public.venue_visits
    WHERE user_id = v_profile_id
      AND arrived_at >= v_since
  ),
  time_patterns AS (
    SELECT 
      EXTRACT(HOUR FROM recorded_at) as hour,
      COUNT(*) as location_count
    FROM public.location_history
    WHERE profile_id = v_profile_id
      AND recorded_at >= v_since
    GROUP BY EXTRACT(HOUR FROM recorded_at)
    ORDER BY location_count DESC
    LIMIT 3
  )
  SELECT jsonb_build_object(
    'movement', jsonb_build_object(
      'total_points', ms.total_points,
      'avg_accuracy', ms.avg_accuracy,
      'first_location', ms.first_location,
      'last_location', ms.last_location,
      'max_distance_m', ms.max_distance,
      'total_distance_m', ms.total_distance_m,
      'avg_daily_distance_m', ms.total_distance_m / p_days_back
    ),
    'venues', jsonb_build_object(
      'unique_venues', vv.unique_venues,
      'total_visits', vv.total_visits,
      'avg_distance_m', vv.avg_venue_distance
    ),
    'time_patterns', (
      SELECT jsonb_agg(
        jsonb_build_object('hour', hour, 'count', location_count)
      ) FROM time_patterns
    ),
    'analysis_period', jsonb_build_object(
      'days_back', p_days_back,
      'since', v_since,
      'min_accuracy', p_min_accuracy
    )
  ) INTO v_result
  FROM movement_stats ms
  CROSS JOIN venue_visits vv;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ========================================
-- 5. Real-time Subscription Functions
-- ========================================

-- Create real-time location subscription with filtering
CREATE OR REPLACE FUNCTION public.subscribe_location_updates(
  p_bbox jsonb DEFAULT NULL,
  p_friend_ids uuid[] DEFAULT NULL,
  p_vibe_filter text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id UUID := auth.uid();
  v_channel_name TEXT;
BEGIN
  -- Validate authentication
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Create unique channel name based on filters
  v_channel_name := 'location_updates_' || v_profile_id::text;
  
  -- Store subscription preferences (could be in a separate table if needed)
  -- For now, we'll use the metadata in location_system_health
  INSERT INTO public.location_system_health (
    component_name,
    metric_name,
    metric_value,
    metadata,
    profile_id
  ) VALUES (
    'location_bus',
    'subscription_created',
    1,
    jsonb_build_object(
      'channel', v_channel_name,
      'bbox', p_bbox,
      'friend_ids', p_friend_ids,
      'vibe_filter', p_vibe_filter
    ),
    v_profile_id
  );
END;
$$;

-- ========================================
-- 6. Grant function permissions
-- ========================================

GRANT EXECUTE ON FUNCTION public.upsert_presence_realtime(double precision, double precision, text, text, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_field_tiles_optimized(double precision, double precision, double precision, double precision, integer, boolean, boolean, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_users_enhanced(double precision, double precision, integer, boolean, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_location_insights(integer, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_location_updates(jsonb, uuid[], text) TO authenticated;

-- ========================================
-- 7. Create indexes for real-time performance
-- ========================================

-- Optimize live_positions for real-time queries
CREATE INDEX IF NOT EXISTS idx_live_positions_visibility_expires
  ON public.live_positions(visibility, expires_at) 
  WHERE expires_at > now() AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_live_positions_geog_expires
  ON public.live_positions USING gist (geog)
  WHERE expires_at > now();

-- Optimize vibes_now for real-time updates
CREATE INDEX IF NOT EXISTS idx_vibes_now_updated_visibility
  ON public.vibes_now(updated_at DESC, visibility)
  WHERE expires_at > now();

-- Optimize location_history for insights queries
CREATE INDEX IF NOT EXISTS idx_location_history_profile_recorded_accuracy
  ON public.location_history(profile_id, recorded_at DESC, accuracy)
  WHERE accuracy IS NOT NULL;

-- ========================================
-- 8. Create trigger for real-time notifications
-- ========================================

-- Function to notify location updates
CREATE OR REPLACE FUNCTION public.notify_location_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only notify for public visibility updates
  IF NEW.visibility = 'public' AND NEW.expires_at > now() THEN
    PERFORM pg_notify(
      'location_updates',
      jsonb_build_object(
        'profile_id', NEW.profile_id,
        'lat', NEW.latitude,
        'lng', NEW.longitude,
        'vibe', NEW.vibe,
        'last_updated', NEW.last_updated,
        'action', TG_OP
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on live_positions
DROP TRIGGER IF EXISTS trg_live_positions_notify ON public.live_positions;
CREATE TRIGGER trg_live_positions_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.live_positions
  FOR EACH ROW EXECUTE FUNCTION public.notify_location_update();