-- Add GIST index on venues.geo for spatial performance
CREATE INDEX IF NOT EXISTS idx_venues_geo_gist ON venues USING GIST (geo);

-- Verify the index was created
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'venues' 
  AND indexname = 'idx_venues_geo_gist';