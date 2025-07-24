-- Fix sparkline materialized view to return lng,lat (x,y) instead of lat,lng
DROP MATERIALIZED VIEW IF EXISTS v_friend_sparkline CASCADE;

CREATE MATERIALIZED VIEW v_friend_sparkline AS
SELECT user_id,
       (   SELECT json_agg(json_build_array(
                     round(st_x(geom)::numeric,6),  -- lng first (x)
                     round(st_y(geom)::numeric,6)   -- lat second (y)
               ) ORDER BY captured_at DESC)
           FROM (
             SELECT geom
             FROM raw_locations
             WHERE user_id = rl.user_id
               AND captured_at >= now() - interval '24 hours'
             ORDER BY captured_at DESC
             LIMIT 20
           ) t
       ) as points
FROM raw_locations rl
GROUP BY user_id;

-- Add unique index for concurrent refreshes
CREATE UNIQUE INDEX idx_mv_friend_sparkline_uid
        ON v_friend_sparkline (user_id);

-- Set RLS and permissions
ALTER MATERIALIZED VIEW v_friend_sparkline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_rows" ON v_friend_sparkline;
CREATE POLICY "friend_sparkline_public_read" ON v_friend_sparkline
  FOR SELECT USING (true);

-- Grant proper permissions
REVOKE SELECT ON v_friend_sparkline FROM PUBLIC, anon;
GRANT SELECT ON v_friend_sparkline TO authenticated;

-- Initial refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY v_friend_sparkline;