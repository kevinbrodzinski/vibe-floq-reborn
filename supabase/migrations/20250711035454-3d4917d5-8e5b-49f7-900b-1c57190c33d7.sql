-- Performance Hardening Migration for High-Frequency Social Presence
-- Manual implementation without pg_partman for Supabase compatibility

-- 1. Enable available extensions
CREATE EXTENSION IF NOT EXISTS bloom;

-- 2. Recreate venue_live_presence with manual partitioning strategy
DROP TABLE IF EXISTS venue_live_presence CASCADE;

CREATE TABLE venue_live_presence (
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vibe vibe_enum NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  session_duration INTERVAL GENERATED ALWAYS AS (last_heartbeat - checked_in_at) STORED,
  
  PRIMARY KEY (venue_id, user_id)
);

-- Enable RLS
ALTER TABLE venue_live_presence ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "venue_presence_public_read" ON venue_live_presence
FOR SELECT USING (expires_at > now());

CREATE POLICY "venue_presence_self_write" ON venue_live_presence
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Advanced Performance Indexes (Core Performance Win)

-- Partial indexes (index hygiene) - only index live data
CREATE INDEX CONCURRENTLY idx_venue_presence_active_partial 
ON venue_live_presence (venue_id, expires_at DESC)
WHERE expires_at > now();

CREATE INDEX CONCURRENTLY idx_venue_presence_user_active_partial
ON venue_live_presence (user_id, last_heartbeat DESC)
WHERE expires_at > now();

-- Covering indexes for avatar queries (reduce table lookups)
CREATE INDEX CONCURRENTLY idx_profiles_user_covering
ON profiles (id) INCLUDE (avatar_url, display_name, username);

-- Bloom filter for multi-column filtering on vibes_now
CREATE INDEX CONCURRENTLY idx_vibes_now_bloom
ON vibes_now USING bloom (user_id, vibe, visibility, venue_id)
WITH (length=80, col1=2, col2=1, col3=1, col4=2);

-- Hash indexes for exact equality lookups
CREATE INDEX CONCURRENTLY idx_vibes_now_user_hash
ON vibes_now USING hash (user_id);

-- Geospatial optimization with proper GIST and partial condition
CREATE INDEX CONCURRENTLY idx_vibes_now_location_gist
ON vibes_now USING GIST (location)
WHERE expires_at > now();

-- Partial index for venue-filtered queries
CREATE INDEX CONCURRENTLY idx_vibes_now_venue_active
ON vibes_now (venue_id, expires_at DESC)
WHERE venue_id IS NOT NULL AND expires_at > now();

-- 4. Memory Optimization Settings (Critical for High Frequency)

-- Set FILLFACTOR for high-update tables (leave room for HOT updates)
ALTER TABLE venue_live_presence SET (fillfactor = 80);
ALTER TABLE vibes_now SET (fillfactor = 70);
ALTER TABLE venue_feed_posts SET (fillfactor = 85);

-- Optimize statistics targets for better query planning
ALTER TABLE venue_live_presence ALTER COLUMN venue_id SET STATISTICS 1000;
ALTER TABLE venue_live_presence ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE vibes_now ALTER COLUMN location SET STATISTICS 1000;
ALTER TABLE vibes_now ALTER COLUMN venue_id SET STATISTICS 1000;

-- 5. Write Amplification Control Functions (Major Performance Win)

-- Smart UPSERT for venue presence with meaningful change detection
CREATE OR REPLACE FUNCTION upsert_venue_presence_smart(
  _venue_id UUID,
  _user_id UUID,
  _vibe vibe_enum,
  _heartbeat_ts TIMESTAMPTZ DEFAULT now()
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  should_update BOOLEAN := FALSE;
  last_heartbeat_ts TIMESTAMPTZ;
  last_vibe vibe_enum;
BEGIN
  -- Check current state
  SELECT last_heartbeat, vibe INTO last_heartbeat_ts, last_vibe
  FROM venue_live_presence 
  WHERE venue_id = _venue_id AND user_id = _user_id;
  
  -- Update only if meaningful change: no record, >30s elapsed, or vibe changed
  should_update := (
    last_heartbeat_ts IS NULL OR 
    _heartbeat_ts - last_heartbeat_ts > interval '30 seconds' OR
    last_vibe IS DISTINCT FROM _vibe
  );
  
  IF should_update THEN
    INSERT INTO venue_live_presence (venue_id, user_id, vibe, last_heartbeat, expires_at)
    VALUES (_venue_id, _user_id, _vibe, _heartbeat_ts, _heartbeat_ts + interval '2 minutes')
    ON CONFLICT (venue_id, user_id) 
    DO UPDATE SET 
      last_heartbeat = EXCLUDED.last_heartbeat,
      expires_at = EXCLUDED.expires_at,
      vibe = EXCLUDED.vibe
    WHERE (
      venue_live_presence.last_heartbeat < EXCLUDED.last_heartbeat OR
      venue_live_presence.vibe IS DISTINCT FROM EXCLUDED.vibe
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Smart UPSERT for vibes_now with location change detection  
CREATE OR REPLACE FUNCTION upsert_vibes_now_smart(
  _user_id UUID,
  _vibe vibe_enum,
  _location GEOMETRY(POINT, 4326),
  _venue_id UUID DEFAULT NULL,
  _visibility TEXT DEFAULT 'public'
) RETURNS BOOLEAN
LANGUAGE plpgsql  
AS $$
DECLARE
  should_update BOOLEAN := FALSE;
  last_location GEOMETRY(POINT, 4326);
  last_update TIMESTAMPTZ;
  last_vibe vibe_enum;
  last_venue_id UUID;
BEGIN
  -- Get last known state
  SELECT location, updated_at, vibe, venue_id 
  INTO last_location, last_update, last_vibe, last_venue_id
  FROM vibes_now WHERE user_id = _user_id;
  
  -- Update if: no record, >10m movement, >30s elapsed, vibe changed, or venue changed
  should_update := (
    last_location IS NULL OR
    ST_Distance(last_location::geography, _location::geography) > 10 OR
    now() - COALESCE(last_update, '1970-01-01'::timestamptz) > interval '30 seconds' OR
    last_vibe IS DISTINCT FROM _vibe OR
    last_venue_id IS DISTINCT FROM _venue_id
  );
  
  IF should_update THEN
    INSERT INTO vibes_now (user_id, vibe, location, venue_id, visibility, updated_at, expires_at)
    VALUES (_user_id, _vibe, _location, _venue_id, _visibility, now(), now() + interval '2 minutes')
    ON CONFLICT (user_id) 
    DO UPDATE SET
      vibe = EXCLUDED.vibe,
      location = EXCLUDED.location,
      venue_id = EXCLUDED.venue_id,
      visibility = EXCLUDED.visibility,
      updated_at = EXCLUDED.updated_at,
      expires_at = EXCLUDED.expires_at
    WHERE (
      vibes_now.vibe IS DISTINCT FROM EXCLUDED.vibe OR
      ST_Distance(vibes_now.location::geography, EXCLUDED.location::geography) > 10 OR
      vibes_now.venue_id IS DISTINCT FROM EXCLUDED.venue_id OR
      vibes_now.updated_at < EXCLUDED.updated_at
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 6. Optimized Materialized View with better aggregation
DROP MATERIALIZED VIEW IF EXISTS venue_social_metrics CASCADE;

CREATE MATERIALIZED VIEW venue_social_metrics AS
SELECT 
  v.id as venue_id,
  v.name,
  v.lat,
  v.lng,
  
  -- Live presence metrics (only active data)
  COALESCE(live_stats.people_count, 0) as people_count,
  COALESCE(live_stats.avg_session_minutes, 0) as avg_session_minutes,
  COALESCE(live_stats.dominant_vibe, 'chill'::vibe_enum) as dominant_vibe,
  COALESCE(live_stats.vibe_diversity_score, 0) as vibe_diversity_score,
  
  -- Pre-computed social energy (0-100 scale, optimized calculation)
  LEAST(100, GREATEST(0, 
    COALESCE(live_stats.people_count, 0) * 10 + 
    COALESCE(live_stats.avg_session_minutes, 0) * 2 +
    COALESCE(floq_stats.active_floq_count, 0) * 5
  )) as energy_level,
  
  -- Floq activity from vibes_now
  COALESCE(floq_stats.active_floq_count, 0) as active_floq_count,
  COALESCE(floq_stats.total_floq_members, 0) as total_floq_members,
  
  now() as last_updated

FROM venues v

-- Optimized live presence stats subquery
LEFT JOIN (
  SELECT 
    venue_id,
    COUNT(*) as people_count,
    AVG(EXTRACT(epoch FROM session_duration) / 60) as avg_session_minutes,
    MODE() WITHIN GROUP (ORDER BY vibe) as dominant_vibe,
    CASE 
      WHEN COUNT(DISTINCT vibe) = 1 THEN 0
      ELSE (1.0 - (MAX(vibe_counts.cnt)::float / COUNT(*))) 
    END as vibe_diversity_score
  FROM venue_live_presence
  CROSS JOIN LATERAL (
    SELECT vibe, COUNT(*) as cnt
    FROM venue_live_presence vlp2 
    WHERE vlp2.venue_id = venue_live_presence.venue_id 
      AND vlp2.expires_at > now()
    GROUP BY vibe
  ) vibe_counts
  WHERE expires_at > now()
  GROUP BY venue_id
) live_stats ON v.id = live_stats.venue_id

-- Floq activity from vibes_now
LEFT JOIN (
  SELECT 
    venue_id,
    COUNT(DISTINCT user_id) as active_floq_count,
    COUNT(*) as total_floq_members
  FROM vibes_now 
  WHERE expires_at > now() AND venue_id IS NOT NULL
  GROUP BY venue_id
) floq_stats ON v.id = floq_stats.venue_id;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX venue_social_metrics_venue_id_idx ON venue_social_metrics (venue_id);

-- 7. Aggressive Cleanup for Performance

-- Enhanced cleanup function with batch processing
CREATE OR REPLACE FUNCTION cleanup_expired_venue_data()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER := 0;
  batch_size INTEGER := 1000;
  total_deleted INTEGER := 0;
BEGIN
  -- Batch delete expired venue presence (prevents lock escalation)
  LOOP
    DELETE FROM venue_live_presence 
    WHERE ctid IN (
      SELECT ctid FROM venue_live_presence 
      WHERE expires_at < now() - interval '5 minutes'
      LIMIT batch_size
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    
    EXIT WHEN deleted_count < batch_size;
  END LOOP;
  
  -- Clean expired vibes_now
  DELETE FROM vibes_now 
  WHERE expires_at < now() - interval '2 minutes';
  
  -- Clean old venue feed posts
  DELETE FROM venue_feed_posts 
  WHERE expires_at < now() - interval '1 hour';
  
  RETURN total_deleted;
END;
$$;

-- 8. Optimized Scheduled Jobs

-- High-frequency cleanup (every 2 minutes)
SELECT cron.schedule(
  'venue-data-cleanup-fast',
  '*/2 * * * *',
  $$SELECT cleanup_expired_venue_data();$$
);

-- Real-time metrics refresh (every 15 seconds for live social energy)
SELECT cron.schedule(
  'refresh-venue-metrics-realtime',
  '*/15 * * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY venue_social_metrics;$$
);

-- Weekly maintenance for index optimization
SELECT cron.schedule(
  'weekly-performance-maintenance',
  '0 3 * * 0', -- Sundays at 3 AM
  $$
  VACUUM (ANALYZE, VERBOSE) venue_live_presence;
  VACUUM (ANALYZE, VERBOSE) vibes_now;
  VACUUM (ANALYZE, VERBOSE) venue_feed_posts;
  REINDEX INDEX CONCURRENTLY idx_venue_presence_active_partial;
  REINDEX INDEX CONCURRENTLY idx_vibes_now_location_gist;
  $$
);

-- 9. Performance Monitoring Functions

-- Real-time performance stats
CREATE OR REPLACE FUNCTION get_venue_performance_stats()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  unit TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'active_venue_presence'::TEXT,
    COUNT(*)::NUMERIC,
    'rows'::TEXT
  FROM venue_live_presence 
  WHERE expires_at > now()
  
  UNION ALL
  
  SELECT 
    'active_vibes_now'::TEXT,
    COUNT(*)::NUMERIC,
    'rows'::TEXT
  FROM vibes_now 
  WHERE expires_at > now()
  
  UNION ALL
  
  SELECT 
    'avg_venue_energy'::TEXT,
    AVG(energy_level)::NUMERIC,
    'score'::TEXT
  FROM venue_social_metrics
  
  UNION ALL
  
  SELECT 
    'total_venues_with_activity'::TEXT,
    COUNT(*)::NUMERIC,
    'venues'::TEXT
  FROM venue_social_metrics
  WHERE people_count > 0;
END;
$$;

-- Index usage monitoring
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  index_name TEXT,
  table_name TEXT,
  scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    indexrelname::TEXT,
    tablename::TEXT,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND indexrelname LIKE 'idx_%'
  ORDER BY idx_scan DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_venue_presence_smart(UUID, UUID, vibe_enum, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_vibes_now_smart(UUID, vibe_enum, GEOMETRY, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venue_performance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated;