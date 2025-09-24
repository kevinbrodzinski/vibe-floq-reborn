-- Cluster Venues Smoke Test Script
-- Run this to test the cluster venues functionality

-- 1. DEV SEEDS: Insert test venues in a tiny bbox (SF Mission District area)
INSERT INTO venues (name, lat, lng, vibe, source) VALUES
('Test Cafe Alpha', 37.7580, -122.4194, 'cafe', 'test'),
('Test Bar Beta', 37.7590, -122.4184, 'bar', 'test'),
('Test Restaurant Gamma', 37.7570, -122.4204, 'restaurant', 'test'),
('Test Club Delta', 37.7585, -122.4189, 'nightlife', 'test'),
('Test Venue Epsilon', 37.7575, -122.4199, 'general', 'test');

-- Get the venue IDs for the vibes_now inserts
WITH test_venues AS (
  SELECT id, name FROM venues WHERE source = 'test'
)
INSERT INTO vibes_now (user_id, location, vibe, venue_id, expires_at)
SELECT 
  gen_random_uuid(),
  ST_Point(lng, lat),
  CASE 
    WHEN name LIKE '%Alpha%' THEN 'work'::vibe_enum
    WHEN name LIKE '%Beta%' THEN 'social'::vibe_enum  
    WHEN name LIKE '%Gamma%' THEN 'food'::vibe_enum
    WHEN name LIKE '%Delta%' THEN 'party'::vibe_enum
    ELSE 'chill'::vibe_enum
  END,
  v.id,
  now() + interval '10 minutes'
FROM venues v
WHERE v.source = 'test';

-- Add multiple people to some venues for testing live_count sorting
WITH popular_venue AS (
  SELECT id FROM venues WHERE name = 'Test Bar Beta' AND source = 'test'
)
INSERT INTO vibes_now (user_id, location, vibe, venue_id, expires_at)
SELECT 
  gen_random_uuid(),
  ST_Point(-122.4184, 37.7590),
  'social'::vibe_enum,
  pv.id,
  now() + interval '10 minutes'
FROM popular_venue pv, generate_series(1, 3);

-- Test the function directly
SELECT 
  name, 
  lat, 
  lng, 
  category, 
  live_count,
  vibe_score,
  check_ins
FROM get_cluster_venues(
  -122.4210, -- min_lng (west)
  37.7565,   -- min_lat (south) 
  -122.4180, -- max_lng (east)
  37.7595    -- max_lat (north)
)
ORDER BY live_count DESC, name ASC;

-- STEP 2: Now test in the UI
-- 1. Reload the map at coordinates: 37.758, -122.419
-- 2. Tap the cluster that appears
-- 3. Verify sheet shows venues sorted by live_count (Test Bar Beta should be first with 4 people)

-- STEP 3: Clear vibes_now and test again
-- DELETE FROM vibes_now WHERE venue_id IN (SELECT id FROM venues WHERE source = 'test');

-- STEP 4: Verify counts drop to 0
-- SELECT name, live_count FROM get_cluster_venues(-122.4210, 37.7565, -122.4180, 37.7595);

-- CLEANUP: Remove test data when done
-- DELETE FROM venues WHERE source = 'test';
-- DELETE FROM vibes_now WHERE venue_id IN (SELECT id FROM venues WHERE source = 'test');

-- Verification queries:
-- Check venues.geo is populated
SELECT COUNT(*) as venues_with_geo FROM venues WHERE geo IS NOT NULL;

-- Check GIST index exists on venues
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'venues' AND indexdef LIKE '%GIST%';

-- Check vibes_now has active presence
SELECT COUNT(*) as active_vibes FROM vibes_now WHERE expires_at > now();