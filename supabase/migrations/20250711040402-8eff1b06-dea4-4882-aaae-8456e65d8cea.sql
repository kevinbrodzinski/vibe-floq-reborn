-- Performance Hardening Migration for High-Frequency Social Presence

-- 1. Enable available extensions
CREATE EXTENSION IF NOT EXISTS bloom;

-- 2. Recreate venue_live_presence table
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
FOR SELECT USING (expires_at > '2025-07-11'::timestamptz);

CREATE POLICY "venue_presence_self_write" ON venue_live_presence
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Performance Indexes 

-- Drop existing indexes that might conflict
DROP INDEX IF EXISTS idx_vibes_now_location_gist;

-- Regular indexes for venue presence
CREATE INDEX idx_venue_presence_active_partial 
ON venue_live_presence (venue_id, expires_at DESC);

CREATE INDEX idx_venue_presence_user_active_partial
ON venue_live_presence (user_id, last_heartbeat DESC);

-- Multi-column indexes for vibes_now
CREATE INDEX idx_vibes_now_user_vibe
ON vibes_now (user_id, vibe);

CREATE INDEX idx_vibes_now_visibility_venue
ON vibes_now (visibility, venue_id);

-- B-tree indexes for exact equality lookups
CREATE INDEX idx_vibes_now_user_btree
ON vibes_now USING btree (user_id);

-- Geospatial optimization with proper GIST
CREATE INDEX idx_vibes_now_location_gist_new
ON vibes_now USING GIST (location);

-- Index for venue-filtered queries
CREATE INDEX idx_vibes_now_venue_active
ON vibes_now (venue_id, expires_at DESC)
WHERE venue_id IS NOT NULL;

-- 4. Memory Optimization Settings

-- Set FILLFACTOR for high-update tables (leave room for HOT updates)
ALTER TABLE venue_live_presence SET (fillfactor = 80);
ALTER TABLE vibes_now SET (fillfactor = 85);
ALTER TABLE venue_feed_posts SET (fillfactor = 85);

-- Optimize statistics targets for better query planning
ALTER TABLE venue_live_presence ALTER COLUMN venue_id SET STATISTICS 1000;
ALTER TABLE venue_live_presence ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE vibes_now ALTER COLUMN location SET STATISTICS 1000;
ALTER TABLE vibes_now ALTER COLUMN venue_id SET STATISTICS 1000;

-- 5. Smart UPSERT functions

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

-- 6. Enhanced cleanup function with batch processing
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

-- 7. Scheduled Jobs
SELECT cron.schedule(
  'floq-venue-data-cleanup-fast',
  '*/2 * * * *',
  $$SELECT cleanup_expired_venue_data();$$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_venue_presence_smart(UUID, UUID, vibe_enum, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_vibes_now_smart(UUID, vibe_enum, GEOMETRY, UUID, TEXT) TO authenticated;