-- Optimize Venue Intelligence System
-- Add strategic indexes and optimize spatial functions

-- Add composite indexes for venue intelligence patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venue_stays_profile_venue_time 
ON venue_stays (profile_id, venue_id, arrived_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_venue_interactions_analytics
ON user_venue_interactions (profile_id, interaction_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibes_now_venue_presence_active
ON vibes_now (venue_id, expires_at DESC) 
WHERE venue_id IS NOT NULL AND expires_at > NOW();

-- Optimize venues_within_radius function to use PostGIS spatial indexes
CREATE OR REPLACE FUNCTION venues_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 5.0,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  categories TEXT[],
  rating DOUBLE PRECISION,
  price_tier TEXT,
  photo_url TEXT,
  phone TEXT,
  website TEXT,
  hours JSONB,
  vibe TEXT,
  vibe_score DOUBLE PRECISION,
  popularity INTEGER,
  provider TEXT,
  provider_id TEXT,
  external_id TEXT,
  source TEXT,
  distance_km DOUBLE PRECISION,
  distance_meters NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_point GEOGRAPHY;
BEGIN
  -- Create user location point
  user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
  
  -- Use PostGIS spatial index for optimal performance
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.address,
    v.lat,
    v.lng,
    v.categories,
    v.rating,
    v.price_tier,
    v.photo_url,
    v.phone,
    v.website,
    v.hours,
    v.vibe,
    v.vibe_score,
    v.popularity,
    v.provider,
    v.provider_id,
    v.external_id,
    v.source,
    (ST_Distance(v.geom, user_point) / 1000.0) AS distance_km,
    ST_Distance(v.geom, user_point) AS distance_meters
  FROM venues v
  WHERE 
    v.geom IS NOT NULL
    AND ST_DWithin(v.geom, user_point, radius_km * 1000) -- Use spatial index
  ORDER BY v.geom <-> user_point -- Use spatial index for ordering
  LIMIT limit_count;
END;
$$;

-- Add function to get friend venue interactions efficiently
CREATE OR REPLACE FUNCTION get_friend_network_venue_data_safe(
  p_user_id UUID,
  p_venue_ids UUID[]
)
RETURNS TABLE (
  venue_id UUID,
  friend_visits INTEGER,
  recent_visitors TEXT[],
  network_rating DOUBLE PRECISION,
  popular_with TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    -- Use existing are_friends function for consistency
    SELECT DISTINCT f.profile_id
    FROM friends_nearby(0, 0, 999999) f -- Get all friends regardless of location
    WHERE EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = f.profile_id 
      AND are_friends(p_user_id, p.id)
    )
  ),
  venue_stats AS (
    SELECT 
      vs.venue_id,
      COUNT(DISTINCT vs.profile_id) as friend_visits,
      array_agg(DISTINCT p.display_name ORDER BY vs.arrived_at DESC) FILTER (WHERE vs.arrived_at > NOW() - INTERVAL '30 days') as recent_visitors,
      AVG(uvi.rating) as avg_rating
    FROM venue_stays vs
    JOIN friend_ids fi ON vs.profile_id = fi.profile_id
    LEFT JOIN profiles p ON vs.profile_id = p.id
    LEFT JOIN user_venue_interactions uvi ON vs.venue_id = uvi.venue_id AND vs.profile_id = uvi.profile_id
    WHERE vs.venue_id = ANY(p_venue_ids)
    GROUP BY vs.venue_id
  )
  SELECT 
    vs.venue_id,
    COALESCE(vs.friend_visits, 0)::INTEGER,
    COALESCE(vs.recent_visitors[1:5], ARRAY[]::TEXT[]), -- Limit to 5 recent visitors
    COALESCE(vs.avg_rating, 0.0)::DOUBLE PRECISION,
    CASE 
      WHEN vs.friend_visits > 5 THEN 'Very popular with your network'
      WHEN vs.friend_visits > 2 THEN 'Popular with your friends'
      WHEN vs.friend_visits > 0 THEN 'Visited by friends'
      ELSE 'New to your network'
    END as popular_with
  FROM venue_stats vs;
END;
$$;

-- Add function to get user behavior patterns efficiently
CREATE OR REPLACE FUNCTION get_user_behavior_patterns_safe(
  p_user_id UUID
)
RETURNS TABLE (
  preferred_categories TEXT[],
  avg_rating_given DOUBLE PRECISION,
  visit_frequency INTEGER,
  favorite_times TEXT[],
  social_preference TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      array_agg(DISTINCT unnest(v.categories)) FILTER (WHERE v.categories IS NOT NULL) as categories,
      AVG(uvi.rating) as avg_rating,
      COUNT(DISTINCT vs.venue_id) as venue_count,
      array_agg(DISTINCT EXTRACT(hour FROM vs.arrived_at)::TEXT) FILTER (WHERE vs.arrived_at IS NOT NULL) as visit_hours
    FROM venue_stays vs
    JOIN venues v ON vs.venue_id = v.id
    LEFT JOIN user_venue_interactions uvi ON vs.venue_id = uvi.venue_id AND vs.profile_id = uvi.profile_id
    WHERE vs.profile_id = p_user_id
      AND vs.arrived_at > NOW() - INTERVAL '90 days'
  ),
  social_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 10 THEN 'highly_social'
        WHEN COUNT(*) > 3 THEN 'moderately_social'
        ELSE 'private'
      END as social_pref
    FROM venue_stays vs
    WHERE vs.profile_id = p_user_id
      AND vs.arrived_at > NOW() - INTERVAL '30 days'
  )
  SELECT 
    COALESCE(us.categories[1:10], ARRAY[]::TEXT[]) as preferred_categories,
    COALESCE(us.avg_rating, 4.0)::DOUBLE PRECISION,
    COALESCE(us.venue_count, 0)::INTEGER,
    COALESCE(us.visit_hours[1:5], ARRAY[]::TEXT[]) as favorite_times,
    COALESCE(ss.social_pref, 'private')::TEXT
  FROM user_stats us
  CROSS JOIN social_stats ss;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION venues_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION get_friend_network_venue_data_safe TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_behavior_patterns_safe TO authenticated;