-- Additional Views for Venue Intelligence Optimization
-- This migration adds venue-specific views for better performance

-- 1. Create venue social proof view for easy friend visit lookups
CREATE OR REPLACE VIEW v_venue_social_proof AS
SELECT 
  vs.venue_id,
  f.friend_id,
  f.display_name,
  f.avatar_url,
  vs.arrived_at,
  vs.departed_at,
  v.name as venue_name,
  v.categories as venue_categories,
  EXTRACT(days FROM (now() - vs.arrived_at)) as days_ago
FROM venue_stays vs
JOIN v_friends_with_presence f ON f.friend_id = vs.profile_id
JOIN venues v ON v.id = vs.venue_id
WHERE f.friend_state = 'accepted'
  AND vs.arrived_at >= now() - interval '90 days'
ORDER BY vs.arrived_at DESC;

-- 2. Create venue crowd intelligence view for real-time data
CREATE OR REPLACE VIEW v_venue_crowd_intelligence AS
SELECT 
  v.id as venue_id,
  v.name,
  v.geom,
  v.categories,
  COUNT(au.profile_id) as current_count,
  array_agg(au.vibe) FILTER (WHERE au.vibe IS NOT NULL) as current_vibes,
  AVG(CASE 
    WHEN au.vibe = 'energetic' THEN 5
    WHEN au.vibe = 'social' THEN 4  
    WHEN au.vibe = 'chill' THEN 3
    WHEN au.vibe = 'flowing' THEN 2
    ELSE 1 
  END) as energy_level,
  MAX(au.updated_at) as last_activity
FROM venues v
LEFT JOIN v_active_users au ON ST_DWithin(
  ST_Point(au.lng, au.lat)::geography, 
  v.geom::geography, 
  100  -- 100 meter radius
)
GROUP BY v.id, v.name, v.geom, v.categories;

-- 3. Create venue recommendation summary view
CREATE OR REPLACE VIEW v_venue_recommendation_summary AS
SELECT 
  v.id as venue_id,
  v.name,
  v.categories,
  v.rating,
  v.price_tier,
  v.address,
  v.photo_url,
  v.lat,
  v.lng,
  v.geom,
  -- Social proof metrics
  COUNT(DISTINCT vsp.friend_id) as friend_visit_count,
  MAX(vsp.arrived_at) as last_friend_visit,
  array_agg(DISTINCT vsp.display_name) FILTER (WHERE vsp.display_name IS NOT NULL) as recent_friend_names,
  -- Crowd intelligence metrics  
  vci.current_count,
  vci.current_vibes,
  vci.energy_level,
  vci.last_activity,
  -- Venue stats
  v.popularity,
  v.vibe_score,
  v.live_count
FROM venues v
LEFT JOIN v_venue_social_proof vsp ON vsp.venue_id = v.id 
  AND vsp.arrived_at >= now() - interval '30 days'
LEFT JOIN v_venue_crowd_intelligence vci ON vci.venue_id = v.id
GROUP BY 
  v.id, v.name, v.categories, v.rating, v.price_tier, v.address, 
  v.photo_url, v.lat, v.lng, v.geom, v.popularity, v.vibe_score, 
  v.live_count, vci.current_count, vci.current_vibes, vci.energy_level, 
  vci.last_activity;

-- 4. Create friend activity timeline view for vibe matching
CREATE OR REPLACE VIEW v_friend_activity_timeline AS
SELECT 
  f.friend_id,
  f.display_name,
  f.avatar_url,
  vs.venue_id,
  v.name as venue_name,
  v.categories as venue_categories,
  vs.arrived_at,
  vs.departed_at,
  (vs.departed_at - vs.arrived_at) as stay_duration,
  -- Infer vibe from venue type and time
  CASE 
    WHEN v.categories && ARRAY['bar', 'nightlife'] AND EXTRACT(hour FROM vs.arrived_at) >= 18 THEN 'social'
    WHEN v.categories && ARRAY['cafe', 'coffee'] AND EXTRACT(hour FROM vs.arrived_at) <= 11 THEN 'chill'
    WHEN v.categories && ARRAY['gym', 'fitness'] THEN 'energetic'
    WHEN v.categories && ARRAY['park', 'outdoor'] THEN 'flowing'
    ELSE 'social'
  END as inferred_vibe
FROM v_friends_with_presence f
JOIN venue_stays vs ON vs.profile_id = f.friend_id
JOIN venues v ON v.id = vs.venue_id
WHERE f.friend_state = 'accepted'
  AND vs.arrived_at >= now() - interval '180 days'
ORDER BY vs.arrived_at DESC;

-- 5. Views automatically inherit RLS from their base tables
-- No additional RLS policies needed - views respect existing table policies

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_stays_venue_arrived 
ON venue_stays(venue_id, arrived_at DESC);

CREATE INDEX IF NOT EXISTS idx_venue_stays_profile_arrived 
ON venue_stays(profile_id, arrived_at DESC);

-- 7. Add comments for documentation
COMMENT ON VIEW v_venue_social_proof IS 'Optimized view for friend visit data at venues - used for social proof in recommendations';
COMMENT ON VIEW v_venue_crowd_intelligence IS 'Real-time crowd data for venues - used for crowd intelligence in recommendations';  
COMMENT ON VIEW v_venue_recommendation_summary IS 'Comprehensive venue data for recommendations - combines social proof and crowd intelligence';
COMMENT ON VIEW v_friend_activity_timeline IS 'Friend venue visit history with inferred vibes - used for vibe matching analysis';

-- 8. Grant permissions
GRANT SELECT ON v_venue_social_proof TO authenticated;
GRANT SELECT ON v_venue_crowd_intelligence TO authenticated;
GRANT SELECT ON v_venue_recommendation_summary TO authenticated;
GRANT SELECT ON v_friend_activity_timeline TO authenticated;