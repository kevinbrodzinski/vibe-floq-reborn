-- Performance Hardening Migration for High-Frequency Social Presence
-- Based on performance schema design patterns for 10k+ heartbeats/minute

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS bloom;
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- 2. Partition venue_live_presence by month (hot data)
-- Drop existing table and recreate as partitioned
DROP TABLE IF EXISTS venue_live_presence CASCADE;

CREATE TABLE venue_live_presence (
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vibe vibe_enum NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  session_duration INTERVAL GENERATED ALWAYS AS (last_heartbeat - checked_in_at) STORED,
  
  PRIMARY KEY (venue_id, user_id, checked_in_at)
) PARTITION BY RANGE (checked_in_at);

-- Create initial partitions for current and next 3 months
CREATE TABLE venue_live_presence_y2025m01 PARTITION OF venue_live_presence
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE venue_live_presence_y2025m02 PARTITION OF venue_live_presence
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE venue_live_presence_y2025m03 PARTITION OF venue_live_presence
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE venue_live_presence_y2025m04 PARTITION OF venue_live_presence
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Enable RLS on partitioned table
ALTER TABLE venue_live_presence ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "venue_presence_public_read" ON venue_live_presence
FOR SELECT USING (expires_at > now());

CREATE POLICY "venue_presence_self_write" ON venue_live_presence
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Partition vibes_log by quarter (analytics data)
-- Rename existing table and recreate as partitioned
ALTER TABLE vibes_log RENAME TO vibes_log_legacy;

CREATE TABLE vibes_log (
  user_id UUID NOT NULL,
  vibe vibe_enum NOT NULL,
  location GEOMETRY(POINT, 4326) NOT NULL,
  venue_id UUID,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_id, ts)
) PARTITION BY RANGE (ts);

-- Create quarterly partitions
CREATE TABLE vibes_log_y2025q1 PARTITION OF vibes_log
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE vibes_log_y2025q2 PARTITION OF vibes_log
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Migrate data from legacy table
INSERT INTO vibes_log SELECT * FROM vibes_log_legacy;

-- Enable RLS
ALTER TABLE vibes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own vibes log" ON vibes_log
FOR ALL USING (auth.uid() = user_id);

-- 4. Advanced Performance Indexes

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

-- Geospatial optimization with proper GIST
CREATE INDEX CONCURRENTLY idx_vibes_now_location_gist
ON vibes_now USING GIST (location)
WHERE expires_at > now();

-- 5. Memory Optimization Settings

-- Set FILLFACTOR for high-update tables (leave room for HOT updates)
ALTER TABLE venue_live_presence SET (fillfactor = 80);
ALTER TABLE vibes_now SET (fillfactor = 70);
ALTER TABLE venue_feed_posts SET (fillfactor = 85);

-- Optimize statistics targets for better query planning
ALTER TABLE venue_live_presence ALTER COLUMN venue_id SET STATISTICS 1000;
ALTER TABLE venue_live_presence ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE vibes_now ALTER COLUMN location SET STATISTICS 1000;

-- 6. Write Amplification Control Functions

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
BEGIN
  -- Check if we should update (meaningful change)
  SELECT last_heartbeat INTO last_heartbeat_ts
  FROM venue_live_presence 
  WHERE venue_id = _venue_id AND user_id = _user_id;
  
  -- Update if: no existing record, >30s since last heartbeat, or vibe changed
  should_update := (
    last_heartbeat_ts IS NULL OR 
    _heartbeat_ts - last_heartbeat_ts > interval '30 seconds'
  );
  
  IF should_update THEN
    INSERT INTO venue_live_presence (venue_id, user_id, vibe, last_heartbeat, expires_at)
    VALUES (_venue_id, _user_id, _vibe, _heartbeat_ts, _heartbeat_ts + interval '2 minutes')
    ON CONFLICT (venue_id, user_id, checked_in_at) 
    DO UPDATE SET 
      last_heartbeat = EXCLUDED.last_heartbeat,
      expires_at = EXCLUDED.expires_at,
      vibe = EXCLUDED.vibe
    WHERE venue_live_presence.last_heartbeat < EXCLUDED.last_heartbeat;
    
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
  _venue_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql  
AS $$
DECLARE
  should_update BOOLEAN := FALSE;
  last_location GEOMETRY(POINT, 4326);
  last_update TIMESTAMPTZ;
BEGIN
  -- Get last known state
  SELECT location, updated_at INTO last_location, last_update
  FROM vibes_now WHERE user_id = _user_id;
  
  -- Update if: no record, >10m movement, >30s time, or vibe/venue changed
  should_update := (
    last_location IS NULL OR
    ST_Distance(last_location::geography, _location::geography) > 10 OR
    now() - last_update > interval '30 seconds'
  );
  
  IF should_update THEN
    INSERT INTO vibes_now (user_id, vibe, location, venue_id, updated_at, expires_at)
    VALUES (_user_id, _vibe, _location, _venue_id, now(), now() + interval '2 minutes')
    ON CONFLICT (user_id) 
    DO UPDATE SET
      vibe = EXCLUDED.vibe,
      location = EXCLUDED.location,
      venue_id = EXCLUDED.venue_id,
      updated_at = EXCLUDED.updated_at,
      expires_at = EXCLUDED.expires_at
    WHERE (
      vibes_now.vibe IS DISTINCT FROM EXCLUDED.vibe OR
      ST_Distance(vibes_now.location::geography, EXCLUDED.location::geography) > 10 OR
      vibes_now.venue_id IS DISTINCT FROM EXCLUDED.venue_id
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 7. Automated Partition Management

-- Function to create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions(
  table_name TEXT,
  months_ahead INTEGER DEFAULT 3
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
  created_count INTEGER := 0;
BEGIN
  FOR i IN 1..months_ahead LOOP
    start_date := date_trunc('month', now() + (i || ' months')::interval)::date;
    end_date := (start_date + interval '1 month')::date;
    partition_name := table_name || '_y' || EXTRACT(year FROM start_date) || 'm' || LPAD(EXTRACT(month FROM start_date)::text, 2, '0');
    
    -- Check if partition exists
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = partition_name) THEN
      EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date);
      created_count := created_count + 1;
    END IF;
  END LOOP;
  
  RETURN created_count;
END;
$$;

-- Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(
  table_name TEXT,
  keep_months INTEGER DEFAULT 6
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff_date DATE;
  partition_record RECORD;
  dropped_count INTEGER := 0;
BEGIN
  cutoff_date := (date_trunc('month', now()) - (keep_months || ' months')::interval)::date;
  
  FOR partition_record IN
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE tablename LIKE table_name || '_y%'
    AND tablename < table_name || '_y' || EXTRACT(year FROM cutoff_date) || 'm' || LPAD(EXTRACT(month FROM cutoff_date)::text, 2, '0')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', partition_record.schemaname, partition_record.tablename);
    dropped_count := dropped_count + 1;
  END LOOP;
  
  RETURN dropped_count;
END;
$$;

-- 8. Optimized Materialized View with Incremental Refresh
DROP MATERIALIZED VIEW IF EXISTS venue_social_metrics CASCADE;

CREATE MATERIALIZED VIEW venue_social_metrics AS
SELECT 
  v.id as venue_id,
  v.name,
  v.lat,
  v.lng,
  
  -- Live counts (only from active presence)
  COUNT(vlp.user_id) FILTER (WHERE vlp.expires_at > now()) as people_count,
  COALESCE(AVG(EXTRACT(epoch FROM vlp.session_duration) / 60) FILTER (WHERE vlp.expires_at > now()), 0) as avg_session_minutes,
  
  -- Vibe distribution (more efficient aggregation)
  MODE() WITHIN GROUP (ORDER BY vlp.vibe) FILTER (WHERE vlp.expires_at > now()) as dominant_vibe,
  
  -- Pre-computed social energy (0-100 scale)
  LEAST(100, GREATEST(0, 
    COUNT(vlp.user_id) FILTER (WHERE vlp.expires_at > now()) * 10 +
    COALESCE(AVG(EXTRACT(epoch FROM vlp.session_duration) / 60) FILTER (WHERE vlp.expires_at > now()), 0) * 2
  )) as energy_level,
  
  -- Floq activity
  COUNT(DISTINCT vn.user_id) FILTER (WHERE vn.venue_id = v.id AND vn.expires_at > now()) as active_floq_count,
  
  now() as last_updated

FROM venues v
LEFT JOIN venue_live_presence vlp ON v.id = vlp.venue_id
LEFT JOIN vibes_now vn ON v.id = vn.venue_id
GROUP BY v.id, v.name, v.lat, v.lng;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX venue_social_metrics_venue_id_idx ON venue_social_metrics (venue_id);

-- 9. Scheduled Maintenance Jobs

-- Create future partitions monthly
SELECT cron.schedule(
  'create-monthly-partitions',
  '0 0 1 * *', -- First day of each month
  $$SELECT create_monthly_partitions('venue_live_presence', 3);$$
);

-- Drop old partitions quarterly  
SELECT cron.schedule(
  'drop-old-partitions', 
  '0 2 1 */3 *', -- First day of each quarter at 2 AM
  $$SELECT drop_old_partitions('venue_live_presence', 6);$$
);

-- Vacuum and analyze partitions weekly
SELECT cron.schedule(
  'partition-maintenance',
  '0 3 * * 0', -- Sundays at 3 AM
  $$
  VACUUM (ANALYZE, VERBOSE) venue_live_presence;
  VACUUM (ANALYZE, VERBOSE) vibes_log;
  REFRESH MATERIALIZED VIEW CONCURRENTLY venue_social_metrics;
  $$
);

-- Real-time metrics refresh (high frequency)
SELECT cron.schedule(
  'refresh-venue-metrics-fast',
  '*/15 * * * * *', -- Every 15 seconds
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY venue_social_metrics;$$
);

-- 10. Performance Monitoring

-- Function to get partition stats
CREATE OR REPLACE FUNCTION get_partition_stats()
RETURNS TABLE (
  table_name TEXT,
  partition_name TEXT,
  row_count BIGINT,
  size_mb NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.tablename::TEXT,
    p.tablename::TEXT,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = p.tablename),
    (pg_total_relation_size(p.tablename::regclass) / 1024 / 1024)::numeric(10,2)
  FROM pg_tables pt
  JOIN pg_tables p ON p.tablename LIKE pt.tablename || '_y%'
  WHERE pt.tablename IN ('venue_live_presence', 'vibes_log')
  ORDER BY pt.tablename, p.tablename;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_venue_presence_smart(UUID, UUID, vibe_enum, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_vibes_now_smart(UUID, vibe_enum, GEOMETRY, UUID) TO authenticated;