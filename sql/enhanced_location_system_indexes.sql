-- Enhanced Location System Performance Optimizations
-- Indexes and query optimizations for proximity operations and venue signatures

-- =============================================
-- PROXIMITY EVENTS TABLE OPTIMIZATIONS
-- =============================================

-- Primary index for proximity event queries by profile
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_timestamp 
ON proximity_events (profile_id, timestamp DESC);

-- Index for target profile queries (who interacted with this user)
CREATE INDEX IF NOT EXISTS idx_proximity_events_target_timestamp 
ON proximity_events (target_profile_id, timestamp DESC);

-- Composite index for proximity pair queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_pair_timestamp 
ON proximity_events (profile_id, target_profile_id, timestamp DESC);

-- Index for event type filtering and analytics
CREATE INDEX IF NOT EXISTS idx_proximity_events_type_timestamp 
ON proximity_events (event_type, timestamp DESC);

-- Index for confidence-based queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_confidence 
ON proximity_events (confidence DESC) 
WHERE confidence >= 0.5;

-- Spatial index for location-based proximity queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_location 
ON proximity_events USING GIST (
  ST_Point(location_lng, location_lat)
) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- =============================================
-- VENUE SIGNATURES TABLE OPTIMIZATIONS
-- =============================================

-- Primary venue lookup index
CREATE INDEX IF NOT EXISTS idx_venue_signatures_venue_id 
ON venue_signatures (venue_id);

-- Spatial index for venue location queries
CREATE INDEX IF NOT EXISTS idx_venue_signatures_location 
ON venue_signatures USING GIST (
  ST_Point(lng, lat)
);

-- WiFi network signature index for fast matching
CREATE INDEX IF NOT EXISTS idx_venue_signatures_wifi_networks 
ON venue_signatures USING GIN (wifi_networks);

-- Bluetooth beacon signature index
CREATE INDEX IF NOT EXISTS idx_venue_signatures_bluetooth_beacons 
ON venue_signatures USING GIN (bluetooth_beacons);

-- Composite index for confidence-based venue queries
CREATE INDEX IF NOT EXISTS idx_venue_signatures_confidence_updated 
ON venue_signatures (confidence DESC, updated_at DESC);

-- =============================================
-- GEOFENCES TABLE OPTIMIZATIONS
-- =============================================

-- Spatial index for geofence boundary queries
CREATE INDEX IF NOT EXISTS idx_geofences_boundary 
ON geofences USING GIST (boundary);

-- Index for active geofences
CREATE INDEX IF NOT EXISTS idx_geofences_active 
ON geofences (is_active) 
WHERE is_active = true;

-- Index for geofence type filtering
CREATE INDEX IF NOT EXISTS idx_geofences_type 
ON geofences (fence_type);

-- User-specific geofence index
CREATE INDEX IF NOT EXISTS idx_geofences_profile_active 
ON geofences (profile_id, is_active) 
WHERE is_active = true;

-- =============================================
-- VENUE BOUNDARIES TABLE OPTIMIZATIONS
-- =============================================

-- Spatial index for venue boundary queries
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_boundary 
ON venue_boundaries USING GIST (boundary);

-- Venue ID index for boundary lookups
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_venue_id 
ON venue_boundaries (venue_id);

-- Confidence-based boundary queries
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_confidence 
ON venue_boundaries (confidence DESC);

-- =============================================
-- EXISTING TABLES OPTIMIZATIONS
-- =============================================

-- Optimize profiles table for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_updated 
ON profiles (updated_at DESC) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Spatial index on profiles for proximity queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_spatial 
ON profiles USING GIST (
  ST_Point(lng, lat)
) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Optimize presence table for real-time queries
CREATE INDEX IF NOT EXISTS idx_presence_profile_updated 
ON presence (profile_id, updated_at DESC);

-- Spatial index on presence for location-based queries
CREATE INDEX IF NOT EXISTS idx_presence_location_spatial 
ON presence USING GIST (
  ST_Point(lng, lat)
) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Materialized view for proximity event statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS proximity_stats_daily AS
SELECT 
  profile_id,
  DATE(timestamp) as event_date,
  COUNT(*) as total_events,
  COUNT(DISTINCT target_profile_id) as unique_contacts,
  COUNT(*) FILTER (WHERE event_type = 'enter') as enter_events,
  COUNT(*) FILTER (WHERE event_type = 'exit') as exit_events,
  COUNT(*) FILTER (WHERE event_type = 'sustain') as sustain_events,
  AVG(confidence) as avg_confidence,
  MAX(confidence) as max_confidence
FROM proximity_events 
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY profile_id, DATE(timestamp);

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_proximity_stats_daily_unique 
ON proximity_stats_daily (profile_id, event_date);

-- Materialized view for venue detection performance
CREATE MATERIALIZED VIEW IF NOT EXISTS venue_detection_stats AS
SELECT 
  venue_id,
  COUNT(*) as total_detections,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT profile_id) as unique_visitors,
  MAX(updated_at) as last_detection
FROM venue_signatures 
GROUP BY venue_id;

-- Index on venue detection stats
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_detection_stats_venue 
ON venue_detection_stats (venue_id);

-- =============================================
-- PERFORMANCE FUNCTIONS
-- =============================================

-- Function to get nearby users with proximity confidence
CREATE OR REPLACE FUNCTION get_nearby_users_with_proximity(
  p_profile_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 1000,
  p_min_confidence DOUBLE PRECISION DEFAULT 0.3
)
RETURNS TABLE (
  profile_id UUID,
  distance_m DOUBLE PRECISION,
  proximity_confidence DOUBLE PRECISION,
  last_proximity_event TIMESTAMP,
  total_proximity_events INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH nearby_profiles AS (
    SELECT 
      pr.profile_id,
      ST_Distance(
        ST_Point(p_lng, p_lat)::geography,
        ST_Point(pr.lng, pr.lat)::geography
      ) as distance_m
    FROM profiles pr
    WHERE pr.profile_id != p_profile_id
      AND pr.lat IS NOT NULL 
      AND pr.lng IS NOT NULL
      AND ST_DWithin(
        ST_Point(p_lng, p_lat)::geography,
        ST_Point(pr.lng, pr.lat)::geography,
        p_radius_m
      )
  ),
  proximity_stats AS (
    SELECT 
      pe.target_profile_id as profile_id,
      AVG(pe.confidence) as avg_confidence,
      MAX(pe.timestamp) as last_event,
      COUNT(*) as event_count
    FROM proximity_events pe
    WHERE pe.profile_id = p_profile_id
      AND pe.timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY pe.target_profile_id
  )
  SELECT 
    np.profile_id,
    np.distance_m,
    COALESCE(ps.avg_confidence, 0.1) as proximity_confidence,
    ps.last_event as last_proximity_event,
    COALESCE(ps.event_count, 0)::INTEGER as total_proximity_events
  FROM nearby_profiles np
  LEFT JOIN proximity_stats ps ON np.profile_id = ps.profile_id
  WHERE COALESCE(ps.avg_confidence, 0.1) >= p_min_confidence
  ORDER BY proximity_confidence DESC, np.distance_m ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get venue signatures with confidence scoring
CREATE OR REPLACE FUNCTION get_venue_signatures_by_location(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 100,
  p_min_confidence DOUBLE PRECISION DEFAULT 0.5
)
RETURNS TABLE (
  venue_id TEXT,
  distance_m DOUBLE PRECISION,
  confidence DOUBLE PRECISION,
  wifi_match_count INTEGER,
  bluetooth_match_count INTEGER,
  last_updated TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vs.venue_id,
    ST_Distance(
      ST_Point(p_lng, p_lat)::geography,
      ST_Point(vs.lng, vs.lat)::geography
    ) as distance_m,
    vs.confidence,
    COALESCE(array_length(vs.wifi_networks, 1), 0) as wifi_match_count,
    COALESCE(array_length(vs.bluetooth_beacons, 1), 0) as bluetooth_match_count,
    vs.updated_at as last_updated
  FROM venue_signatures vs
  WHERE vs.confidence >= p_min_confidence
    AND ST_DWithin(
      ST_Point(p_lng, p_lat)::geography,
      ST_Point(vs.lng, vs.lat)::geography,
      p_radius_m
    )
  ORDER BY vs.confidence DESC, distance_m ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MAINTENANCE TASKS
-- =============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_proximity_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY proximity_stats_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY venue_detection_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old proximity events
CREATE OR REPLACE FUNCTION cleanup_old_proximity_events(
  p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM proximity_events 
  WHERE timestamp < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

-- View for proximity event performance monitoring
CREATE OR REPLACE VIEW proximity_performance_stats AS
SELECT 
  'proximity_events'::text as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 day') as records_last_24h,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 hour') as records_last_hour,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT profile_id) as unique_profiles,
  COUNT(DISTINCT target_profile_id) as unique_targets
FROM proximity_events;

-- View for venue signature performance monitoring
CREATE OR REPLACE VIEW venue_signature_performance_stats AS
SELECT 
  'venue_signatures'::text as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '1 day') as updated_last_24h,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT venue_id) as unique_venues,
  AVG(array_length(wifi_networks, 1)) as avg_wifi_networks,
  AVG(array_length(bluetooth_beacons, 1)) as avg_bluetooth_beacons
FROM venue_signatures;

-- =============================================
-- GRANTS AND PERMISSIONS
-- =============================================

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_nearby_users_with_proximity TO authenticated;
GRANT EXECUTE ON FUNCTION get_venue_signatures_by_location TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_proximity_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_proximity_events TO service_role;

-- Grant permissions for the materialized views
GRANT SELECT ON proximity_stats_daily TO authenticated;
GRANT SELECT ON venue_detection_stats TO authenticated;
GRANT SELECT ON proximity_performance_stats TO authenticated;
GRANT SELECT ON venue_signature_performance_stats TO authenticated;

-- =============================================
-- SCHEDULED MAINTENANCE (for cron extension)
-- =============================================

-- Schedule materialized view refresh (every hour)
-- SELECT cron.schedule('refresh-proximity-stats', '0 * * * *', 'SELECT refresh_proximity_stats();');

-- Schedule old data cleanup (daily at 2 AM)
-- SELECT cron.schedule('cleanup-proximity-events', '0 2 * * *', 'SELECT cleanup_old_proximity_events(30);');

COMMENT ON FUNCTION get_nearby_users_with_proximity IS 'Enhanced proximity query with confidence scoring';
COMMENT ON FUNCTION get_venue_signatures_by_location IS 'Multi-signal venue detection with confidence scoring';
COMMENT ON FUNCTION refresh_proximity_stats IS 'Refresh proximity statistics materialized views';
COMMENT ON FUNCTION cleanup_old_proximity_events IS 'Clean up old proximity events to maintain performance';