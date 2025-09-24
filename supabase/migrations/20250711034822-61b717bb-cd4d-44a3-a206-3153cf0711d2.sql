-- Drop the poorly designed tables first
DROP TABLE IF EXISTS venue_live_presence CASCADE;
DROP TABLE IF EXISTS venue_floq_sessions CASCADE;
DROP TABLE IF EXISTS venue_emotion_blend CASCADE;
DROP TABLE IF EXISTS venue_social_density CASCADE;
DROP TABLE IF EXISTS venue_feed_posts CASCADE;

-- 1. Create optimized venue_live_presence with composite PK
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

-- Enable RLS with split policies for security
ALTER TABLE venue_live_presence ENABLE ROW LEVEL SECURITY;

-- Users can see public presence at venues they can access
CREATE POLICY "venue_presence_public_read" ON venue_live_presence
FOR SELECT USING (expires_at > now());

-- Users can only manage their own presence
CREATE POLICY "venue_presence_self_write" ON venue_live_presence
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Performance indexes
CREATE INDEX idx_venue_presence_active 
ON venue_live_presence (venue_id, expires_at);

CREATE INDEX idx_venue_presence_user_active 
ON venue_live_presence (user_id, expires_at);

-- Auto-cleanup trigger for expired presence
CREATE OR REPLACE FUNCTION cleanup_expired_venue_presence()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM venue_live_presence 
  WHERE expires_at < now() - interval '5 minutes';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_presence_cleanup
AFTER INSERT OR UPDATE ON venue_live_presence
EXECUTE FUNCTION cleanup_expired_venue_presence();

-- 2. Materialized view for venue social metrics
CREATE MATERIALIZED VIEW venue_social_metrics AS
SELECT 
  v.id as venue_id,
  v.name,
  v.lat,
  v.lng,
  
  -- Live counts
  COALESCE(live_stats.total_present, 0) as people_count,
  COALESCE(live_stats.avg_session_minutes, 0) as avg_session_minutes,
  
  -- Vibe distribution
  COALESCE(vibe_stats.primary_vibe, 'chill'::vibe_enum) as dominant_vibe,
  COALESCE(vibe_stats.vibe_diversity, 0) as vibe_diversity_score,
  
  -- Social energy (0-100 scale)
  LEAST(100, GREATEST(0, 
    COALESCE(live_stats.total_present, 0) * 10 + 
    COALESCE(live_stats.avg_session_minutes, 0) * 2
  )) as energy_level,
  
  -- Active floqs at venue
  COALESCE(floq_stats.active_floqs, 0) as active_floq_count,
  COALESCE(floq_stats.total_floq_members, 0) as total_floq_members,
  
  now() as last_updated

FROM venues v

LEFT JOIN (
  -- Live presence stats
  SELECT 
    venue_id,
    COUNT(*) as total_present,
    AVG(EXTRACT(epoch FROM session_duration) / 60) as avg_session_minutes
  FROM venue_live_presence 
  WHERE expires_at > now()
  GROUP BY venue_id
) live_stats ON v.id = live_stats.venue_id

LEFT JOIN (
  -- Vibe distribution
  SELECT 
    venue_id,
    MODE() WITHIN GROUP (ORDER BY vibe) as primary_vibe,
    (1.0 - (MAX(vibe_count) / SUM(vibe_count))) as vibe_diversity
  FROM (
    SELECT 
      venue_id, 
      vibe, 
      COUNT(*) as vibe_count
    FROM venue_live_presence 
    WHERE expires_at > now()
    GROUP BY venue_id, vibe
  ) vibe_breakdown
  GROUP BY venue_id
) vibe_stats ON v.id = vibe_stats.venue_id

LEFT JOIN (
  -- Active floqs at venue (from existing vibes_now table)
  SELECT 
    venue_id,
    COUNT(DISTINCT user_id) FILTER (WHERE venue_id IS NOT NULL) as active_floqs,
    COUNT(*) as total_floq_members
  FROM vibes_now 
  WHERE expires_at > now() AND venue_id IS NOT NULL
  GROUP BY venue_id
) floq_stats ON v.id = floq_stats.venue_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX venue_social_metrics_venue_id_idx 
ON venue_social_metrics (venue_id);

-- 3. Optimized venue feed with Storage integration
CREATE TABLE venue_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Content stored in Storage, only metadata here
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'audio')),
  storage_path TEXT, -- NULL for text posts
  text_content TEXT, -- NULL for media posts
  
  -- Metadata for efficient querying
  vibe vibe_enum NOT NULL,
  mood_tags TEXT[] DEFAULT '{}',
  location GEOMETRY(POINT, 4326) NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0
);

-- RLS for venue feed
ALTER TABLE venue_feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_feed_public_read" ON venue_feed_posts
FOR SELECT USING (expires_at > now());

CREATE POLICY "venue_feed_user_create" ON venue_feed_posts
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "venue_feed_user_update_own" ON venue_feed_posts
FOR UPDATE USING (user_id = auth.uid());

-- Indexes for venue feed
CREATE INDEX idx_venue_feed_active 
ON venue_feed_posts (venue_id, created_at DESC);

CREATE INDEX idx_venue_feed_location 
ON venue_feed_posts USING GIST (location);

-- Auto-cleanup for expired posts
CREATE OR REPLACE FUNCTION cleanup_expired_venue_posts()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM venue_feed_posts 
  WHERE expires_at < now() - interval '1 hour';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_posts_cleanup
AFTER INSERT ON venue_feed_posts
EXECUTE FUNCTION cleanup_expired_venue_posts();

-- 4. Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_venue_social_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY venue_social_metrics;
END;
$$;

-- 5. Schedule periodic refresh (every 30 seconds)
SELECT cron.schedule(
  'refresh-venue-metrics',
  '*/30 * * * * *', -- every 30 seconds
  $$SELECT refresh_venue_social_metrics();$$
);

-- 6. General cleanup job (every 5 minutes)  
SELECT cron.schedule(
  'venue-data-cleanup',
  '*/5 * * * *', -- every 5 minutes
  $$
  DELETE FROM venue_live_presence WHERE expires_at < now() - interval '5 minutes';
  DELETE FROM venue_feed_posts WHERE expires_at < now() - interval '1 hour';
  $$
);