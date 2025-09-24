-- ◂────────────  get_location_track()  ────────────▸
CREATE OR REPLACE FUNCTION public.get_location_track (
  p_profile_id uuid,
  p_start_time timestamptz DEFAULT (CURRENT_DATE - INTERVAL '1 day'),
  p_end_time   timestamptz DEFAULT CURRENT_TIMESTAMP,
  p_limit      int         DEFAULT 1000
) RETURNS TABLE (
  lat         double precision,
  lng         double precision,
  captured_at timestamptz,
  accuracy    double precision,
  venue_id    uuid
)
LANGUAGE sql
STABLE
AS $$
/* Raw GPS points ----------------------------------------------------------- */
WITH location_points AS (
  SELECT
    ST_Y(geom::geometry)      AS lat,
    ST_X(geom::geometry)      AS lng,
    captured_at,
    accuracy_m::double precision  AS accuracy,
    NULL::uuid                AS venue_id
  FROM public.raw_locations
  WHERE profile_id = p_profile_id
    AND captured_at BETWEEN p_start_time AND p_end_time
    AND geom IS NOT NULL
  ORDER BY captured_at DESC
  LIMIT p_limit
),

/* Venue "stops" (coalesced path points) ------------------------------------ */
venue_stops AS (
  SELECT
    ST_Y(v.geom::geometry)    AS lat,
    ST_X(v.geom::geometry)    AS lng,
    vs.arrived_at             AS captured_at,
    30.0                      AS accuracy,       -- you can refine per-venue later
    vs.venue_id               AS venue_id
  FROM public.venue_stays  vs
  JOIN public.venues       v  ON v.id = vs.venue_id
  WHERE vs.profile_id = p_profile_id
    AND vs.arrived_at BETWEEN p_start_time AND p_end_time
    AND v.geom IS NOT NULL
)

/* Union the two sources & order chronologically ---------------------------- */
SELECT *
FROM (
  SELECT * FROM location_points
  UNION ALL
  SELECT * FROM venue_stops
) AS combined
ORDER BY captured_at DESC;
$$;

-- Allow signed-in users to call it (RLS still governs table access)
GRANT EXECUTE ON FUNCTION public.get_location_track TO authenticated;

-- Create index for performance if not exists
CREATE INDEX IF NOT EXISTS idx_raw_locations_profile_time 
ON public.raw_locations (profile_id, captured_at DESC) 
WHERE geom IS NOT NULL;