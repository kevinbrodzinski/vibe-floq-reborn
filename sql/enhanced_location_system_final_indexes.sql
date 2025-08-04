-- Enhanced Location System - Final Performance Indexes
-- Only adds missing indexes for existing tables
-- Safe to run on existing database

-- =============================================
-- PROXIMITY EVENTS PERFORMANCE INDEXES
-- =============================================

-- Indexes for enhanced proximity event queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_a_timestamp 
ON proximity_events (profile_id_a, event_ts DESC);

CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_b_timestamp 
ON proximity_events (profile_id_b, event_ts DESC);

CREATE INDEX IF NOT EXISTS idx_proximity_events_pair_timestamp 
ON proximity_events (profile_id_a, profile_id_b, event_ts DESC);

CREATE INDEX IF NOT EXISTS idx_proximity_events_type_timestamp 
ON proximity_events (event_type, event_ts DESC) 
WHERE event_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proximity_events_confidence 
ON proximity_events (confidence DESC) 
WHERE confidence >= 0.5;

-- =============================================
-- VENUE SIGNATURES PERFORMANCE INDEXES
-- =============================================

-- Additional performance indexes for venue signatures
CREATE INDEX IF NOT EXISTS idx_venue_signatures_confidence_updated 
ON venue_signatures (confidence_score DESC, last_verified DESC);

CREATE INDEX IF NOT EXISTS idx_venue_signatures_signal_strength 
ON venue_signatures (signal_strength DESC) 
WHERE signal_strength IS NOT NULL;

-- =============================================
-- GEOFENCES PERFORMANCE INDEXES
-- =============================================

-- Index for active geofences by profile (if not exists)
CREATE INDEX IF NOT EXISTS idx_geofences_profile_active 
ON geofences (profile_id, is_active) 
WHERE is_active = true;

-- =============================================
-- VENUE BOUNDARIES PERFORMANCE INDEXES
-- =============================================

-- Confidence-based queries for venue boundaries
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_confidence 
ON venue_boundaries (confidence_score DESC);

-- =============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
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
  AND event_type IS NOT NULL
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
-- PERFORMANCE MONITORING VIEWS
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
-- UTILITY FUNCTIONS
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
-- GRANTS AND PERMISSIONS
-- =============================================

-- Grant permissions for utility functions
GRANT EXECUTE ON FUNCTION refresh_proximity_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_proximity_events TO service_role;

-- Grant permissions for views
GRANT SELECT ON proximity_stats_daily TO authenticated;
GRANT SELECT ON venue_detection_stats TO authenticated;
GRANT SELECT ON proximity_performance_stats TO authenticated;
GRANT SELECT ON venue_signature_performance_stats TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION refresh_proximity_stats IS 'Refresh proximity statistics materialized views';
COMMENT ON FUNCTION cleanup_old_proximity_events IS 'Clean up old proximity events to maintain performance';
COMMENT ON MATERIALIZED VIEW proximity_stats_daily IS 'Daily aggregated proximity event statistics for analytics';
COMMENT ON MATERIALIZED VIEW venue_detection_stats IS 'Venue signature detection performance statistics';

-- Migration completed successfully
-- All indexes and views are now optimized for enhanced location system performance