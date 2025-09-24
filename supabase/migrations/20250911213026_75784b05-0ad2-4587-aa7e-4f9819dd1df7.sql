-- Friend Flows: Secure RPC for fetching recent friend flows within viewport
-- Simplified version without array operations that don't exist

CREATE OR REPLACE FUNCTION recent_friend_flows_secure(
  west  double precision,
  south double precision,
  east  double precision,
  north double precision,
  since_minutes integer DEFAULT 90,
  max_per_friend integer DEFAULT 200
)
RETURNS TABLE (
  friend_id uuid,
  friend_name text,
  avatar_url text,
  flow_id uuid,
  t_head timestamptz,
  line_geojson jsonb,
  head_lng double precision,
  head_lat double precision
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid
  ),
  friends AS (
    -- accepted friendships for the caller
    SELECT CASE 
      WHEN f.profile_low = (SELECT uid FROM me) THEN f.profile_high 
      ELSE f.profile_low 
    END AS fid
    FROM friendships f
    WHERE friend_state = 'accepted'
      AND ((f.profile_low = (SELECT uid FROM me)) OR (f.profile_high = (SELECT uid FROM me)))
  ),
  bb AS (
    SELECT ST_MakeEnvelope(west, south, east, north, 4326) AS geom
  ),
  seg AS (
    SELECT fs.flow_id,
           fs.arrived_at AS t,
           fs.center,
           ROW_NUMBER() OVER (PARTITION BY fs.flow_id ORDER BY fs.arrived_at DESC) as rn
    FROM flow_segments fs
    JOIN flows fl ON fl.id = fs.flow_id
    WHERE fl.profile_id IN (SELECT fid FROM friends)
      AND COALESCE(fl.ended_at, now()) >= now() - (since_minutes || ' minutes')::interval
      AND ST_Intersects(fs.center, (SELECT geom FROM bb))
  ),
  tails AS (
    -- compress per flow into a single tail (last N points) and head
    SELECT s.flow_id,
           array_agg(s.center ORDER BY s.t ASC) AS pts_asc,
           max(s.t) AS t_head
    FROM seg s
    WHERE s.rn <= max_per_friend
    GROUP BY s.flow_id
  ),
  lines AS (
    SELECT t.flow_id,
           t.t_head,
           ST_AsGeoJSON(
             ST_SimplifyPreserveTopology(
               ST_MakeLine(t.pts_asc),
               0.0002
             )
           )::jsonb AS line_geojson,
           ST_X(t.pts_asc[array_upper(t.pts_asc, 1)]) AS head_lng,
           ST_Y(t.pts_asc[array_upper(t.pts_asc, 1)]) AS head_lat
    FROM tails t
    WHERE array_length(t.pts_asc, 1) > 0
  )
  SELECT fl.profile_id AS friend_id,
         p.display_name AS friend_name,
         p.avatar_url,
         l.flow_id,
         l.t_head,
         l.line_geojson,
         l.head_lng,
         l.head_lat
  FROM lines l
  JOIN flows fl ON fl.id = l.flow_id
  LEFT JOIN profiles p ON p.id = fl.profile_id;
$$;