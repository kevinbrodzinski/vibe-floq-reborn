-- Create RPC function to get location track for timewarp playback
CREATE OR REPLACE FUNCTION get_location_track(
  p_profile_id uuid,
  p_start_time timestamptz DEFAULT (CURRENT_DATE - INTERVAL '1 day'),
  p_end_time timestamptz DEFAULT CURRENT_TIMESTAMP,
  p_limit int DEFAULT 1000
) RETURNS TABLE (
  lat double precision,
  lng double precision,
  captured_at timestamptz,
  accuracy double precision,
  venue_id uuid
) LANGUAGE sql STABLE AS $$
WITH location_points AS (
  SELECT 
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng,
    captured_at,
    accuracy,
    NULL::uuid as venue_id
  FROM raw_locations 
  WHERE profile_id = p_profile_id
    AND captured_at BETWEEN p_start_time AND p_end_time
    AND location IS NOT NULL
  ORDER BY captured_at DESC
  LIMIT p_limit
),
venue_stops AS (
  SELECT 
    ST_Y(v.location::geometry) as lat,
    ST_X(v.location::geometry) as lng,
    vs.arrived_at as captured_at,
    30.0 as accuracy, -- Venue accuracy placeholder
    vs.venue_id as venue_id
  FROM venue_stays vs
  JOIN venues v ON vs.venue_id = v.id
  WHERE vs.profile_id = p_profile_id
    AND vs.arrived_at BETWEEN p_start_time AND p_end_time
    AND v.location IS NOT NULL
)
SELECT * FROM (
  SELECT lat, lng, captured_at, accuracy, venue_id FROM location_points
  UNION ALL
  SELECT lat, lng, captured_at, accuracy, venue_id FROM venue_stops
) combined
ORDER BY captured_at DESC;
$$;

-- Grant access to authenticated users for their own data
GRANT EXECUTE ON FUNCTION get_location_track TO authenticated;

-- Create index for performance if not exists
CREATE INDEX IF NOT EXISTS idx_raw_locations_profile_time 
ON raw_locations (profile_id, captured_at DESC) 
WHERE location IS NOT NULL;