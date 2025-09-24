-- Enhanced Location System Performance Optimizations
-- Indexes and query optimizations for proximity operations and venue signatures

-- =============================================
-- PROXIMITY EVENTS TABLE OPTIMIZATIONS
-- =============================================

-- Primary index for proximity event queries by profile
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_a_timestamp 
ON proximity_events (profile_id_a, event_ts DESC);

-- Index for target profile queries (who interacted with this user)
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_b_timestamp 
ON proximity_events (profile_id_b, event_ts DESC);

-- Composite index for proximity pair queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_pair_timestamp 
ON proximity_events (profile_id_a, profile_id_b, event_ts DESC);

-- Index for event type filtering and analytics
CREATE INDEX IF NOT EXISTS idx_proximity_events_type_timestamp 
ON proximity_events (event_type, event_ts DESC);

-- Index for confidence-based queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_confidence 
ON proximity_events (confidence DESC) 
WHERE confidence >= 0.5;

-- Note: Removed spatial index as location_lat/lng columns don't exist in current schema

-- =============================================
-- VENUE SIGNATURES TABLE OPTIMIZATIONS
-- =============================================

-- Primary venue lookup index (already exists)
-- CREATE INDEX IF NOT EXISTS idx_venue_signatures_venue_id ON venue_signatures (venue_id);

-- Index for signal type filtering (already exists)  
-- CREATE INDEX IF NOT EXISTS idx_venue_signatures_signal_type ON venue_signatures (signal_type);

-- Additional performance indexes for venue signatures
CREATE INDEX IF NOT EXISTS idx_venue_signatures_confidence_updated 
ON venue_signatures (confidence_score DESC, last_verified DESC);

-- Index for signal strength filtering
CREATE INDEX IF NOT EXISTS idx_venue_signatures_signal_strength 
ON venue_signatures (signal_strength DESC) 
WHERE signal_strength IS NOT NULL;

-- =============================================
-- GEOFENCES TABLE OPTIMIZATIONS  
-- =============================================

-- Note: Most geofence indexes should already exist from the schema
-- Adding any missing performance indexes

-- Index for active geofences by profile (if not exists)
CREATE INDEX IF NOT EXISTS idx_geofences_profile_active 
ON geofences (profile_id, is_active) 
WHERE is_active = true;

-- =============================================
-- VENUE BOUNDARIES TABLE OPTIMIZATIONS
-- =============================================

-- Note: Core indexes already exist from schema
-- Adding confidence-based queries
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_confidence 
ON venue_boundaries (confidence_score DESC);

-- =============================================
-- EXISTING TABLES OPTIMIZATIONS
-- =============================================

-- Optimize profiles table for location queries (if lat/lng columns exist)
-- Note: Need to check if profiles has location columns before creating these

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Materialized view for proximity event statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS proximity_stats_daily AS
SELECT 
  profile_id_a,
  DATE(event_ts) as event_date,
  COUNT(*) as total_events,
  COUNT(DISTINCT profile_id_b) as unique_contacts,
  COUNT(*) FILTER (WHERE event_type = 'enter') as enter_events,
  COUNT(*) FILTER (WHERE event_type = 'exit') as exit_events,
  COUNT(*) FILTER (WHERE event_type = 'sustain') as sustain_events,
  AVG(confidence) as avg_confidence,
  MAX(confidence) as max_confidence
FROM proximity_events 
WHERE event_ts >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY profile_id_a, DATE(event_ts);

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_proximity_stats_daily_unique 
ON proximity_stats_daily (profile_id_a, event_date);

-- Materialized view for venue detection performance
CREATE MATERIALIZED VIEW IF NOT EXISTS venue_detection_stats AS
SELECT 
  venue_id,
  COUNT(*) as total_signatures,
  AVG(confidence_score) as avg_confidence,
  MAX(last_verified) as last_detection,
  COUNT(DISTINCT signal_type) as signal_types_count
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
  WITH proximity_stats AS (
    SELECT 
      CASE 
        WHEN pe.profile_id_a = p_profile_id THEN pe.profile_id_b
        ELSE pe.profile_id_a
      END as other_profile_id,
      AVG(pe.confidence) as avg_confidence,
      MAX(pe.event_ts) as last_event,
      COUNT(*) as event_count
    FROM proximity_events pe
    WHERE (pe.profile_id_a = p_profile_id OR pe.profile_id_b = p_profile_id)
      AND pe.event_ts >= NOW() - INTERVAL '7 days'
    GROUP BY other_profile_id
  )
  SELECT 
    ps.other_profile_id as profile_id,
    0.0 as distance_m, -- Would need location data to calculate actual distance
    ps.avg_confidence as proximity_confidence,
    ps.last_event as last_proximity_event,
    ps.event_count::INTEGER as total_proximity_events
  FROM proximity_stats ps
  WHERE ps.avg_confidence >= p_min_confidence
  ORDER BY ps.avg_confidence DESC;
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
  confidence DOUBLE PRECISION,
  signal_count INTEGER,
  last_updated TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vs.venue_id,
    AVG(vs.confidence_score) as confidence,
    COUNT(*)::INTEGER as signal_count,
    MAX(vs.last_verified) as last_updated
  FROM venue_signatures vs
  WHERE vs.confidence_score >= p_min_confidence
  GROUP BY vs.venue_id
  HAVING AVG(vs.confidence_score) >= p_min_confidence
  ORDER BY confidence DESC;
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
  WHERE event_ts < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
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
  COUNT(*) FILTER (WHERE event_ts >= NOW() - INTERVAL '1 day') as records_last_24h,
  COUNT(*) FILTER (WHERE event_ts >= NOW() - INTERVAL '1 hour') as records_last_hour,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT profile_id_a) as unique_profiles_a,
  COUNT(DISTINCT profile_id_b) as unique_profiles_b
FROM proximity_events;

-- View for venue signature performance monitoring
CREATE OR REPLACE VIEW venue_signature_performance_stats AS
SELECT 
  'venue_signatures'::text as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE last_verified >= NOW() - INTERVAL '1 day') as updated_last_24h,
  AVG(confidence_score) as avg_confidence,
  COUNT(DISTINCT venue_id) as unique_venues,
  COUNT(DISTINCT signal_type) as unique_signal_types
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
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION get_nearby_users_with_proximity IS 'Enhanced proximity query with confidence scoring';
COMMENT ON FUNCTION get_venue_signatures_by_location IS 'Multi-signal venue detection with confidence scoring';
COMMENT ON FUNCTION refresh_proximity_stats IS 'Refresh proximity statistics materialized views';
COMMENT ON FUNCTION cleanup_old_proximity_events IS 'Clean up old proximity events to maintain performance';