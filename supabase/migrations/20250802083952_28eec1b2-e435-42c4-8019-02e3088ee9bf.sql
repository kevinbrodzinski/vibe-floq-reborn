-- Add GIST index for efficient location queries
CREATE INDEX IF NOT EXISTS vibes_now_location_gix
  ON vibes_now USING GIST (location);

-- Create the improved rank_nearby_people function
CREATE OR REPLACE FUNCTION public.rank_nearby_people (
  p_lat   double precision,
  p_lng   double precision,
  p_limit integer DEFAULT 12
)
RETURNS TABLE (
  profile_id uuid,
  vibe       text,
  meters     int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) AS g
  )
  SELECT
    vn.profile_id,
    vn.vibe::text,
    ST_Distance(vn.location::geography, me.g::geography)::int AS meters
  FROM   vibes_now          vn,
         me
  WHERE  vn.visibility = 'public'
    AND  vn.profile_id IS NOT NULL
    AND  (auth.uid() IS NULL OR vn.profile_id <> auth.uid())
    AND  vn.updated_at > now() - interval '15 minutes'
  ORDER  BY vn.location <-> me.g                     -- K-NN if GIST index present
  LIMIT  p_limit;
$$;

GRANT EXECUTE
  ON FUNCTION public.rank_nearby_people(double precision, double precision, integer)
  TO authenticated, anon;