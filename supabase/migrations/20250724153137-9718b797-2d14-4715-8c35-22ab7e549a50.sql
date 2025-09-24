-- Daily Recap Migration
-- 1A. Table to cache per-user recap JSON
CREATE TABLE IF NOT EXISTS daily_recap_cache (
  user_id      uuid   NOT NULL,
  day          date   NOT NULL,
  payload      jsonb  NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE daily_recap_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_recap_row" ON daily_recap_cache
  FOR SELECT USING (auth.uid() = user_id);

-- 1B. SQL helper that builds recap JSON for (uid, day)
CREATE OR REPLACE FUNCTION build_daily_recap(uid uuid, d date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mins_out       int;
  venues_cnt     int;
  encounters_cnt int;
  longest_mins   int;
  longest_venue  text;
  timeline       jsonb;
  top_venues     jsonb;
BEGIN
  -- Total minutes out from materialized view
  SELECT COALESCE(SUM(minutes_spent),0)
    INTO mins_out
  FROM v_time_in_venue_daily
  WHERE profile_id = uid
    AND day = d;

  -- Count distinct venues visited
  SELECT COUNT(DISTINCT venue_id)
    INTO venues_cnt
  FROM venue_stays
  WHERE profile_id = uid
    AND arrived_at::date = d;

  -- Count encounters/crossed paths
  SELECT COUNT(*)
    INTO encounters_cnt
  FROM crossed_paths
  WHERE (user_a = uid OR user_b = uid)
    AND encounter_date = d;

  -- Longest stay calculation
  SELECT CEIL(EXTRACT(EPOCH FROM (COALESCE(departed_at, arrived_at + INTERVAL '30 minutes') - arrived_at))/60),
         v.name
    INTO longest_mins, longest_venue
  FROM venue_stays vs
  JOIN venues v ON v.id = vs.venue_id
  WHERE vs.profile_id = uid AND arrived_at::date = d
  ORDER BY CEIL(EXTRACT(EPOCH FROM (COALESCE(departed_at, arrived_at + INTERVAL '30 minutes') - arrived_at))/60) DESC
  LIMIT 1;

  -- Timeline buckets (hourly breakdown)
  SELECT jsonb_agg(
           jsonb_build_object('hour', h, 'mins', COALESCE(m,0))
           ORDER BY h
         )
    INTO timeline
  FROM generate_series(0,23) AS h
  LEFT JOIN LATERAL (
    SELECT CEIL(SUM(EXTRACT(EPOCH FROM 
      LEAST(COALESCE(departed_at, arrived_at + INTERVAL '30 minutes'), 
            arrived_at + INTERVAL '60 minutes') - arrived_at
    ))/60) AS m
    FROM venue_stays
    WHERE profile_id = uid
      AND arrived_at::date = d
      AND EXTRACT(hour FROM arrived_at) = h
  ) t ON true;

  -- Top venues for the day (by estimated minutes)
  SELECT jsonb_agg(
           jsonb_build_object(
             'id', v.id, 
             'name', v.name,
             'mins', CEIL(SUM(EXTRACT(EPOCH FROM 
               COALESCE(departed_at, arrived_at + INTERVAL '30 minutes') - arrived_at
             ))/60),
             'popularity', v.popularity
           ) ORDER BY CEIL(SUM(EXTRACT(EPOCH FROM 
             COALESCE(departed_at, arrived_at + INTERVAL '30 minutes') - arrived_at
           ))/60) DESC
         )
    INTO top_venues
  FROM venue_stays vs
  JOIN venues v ON v.id = vs.venue_id
  WHERE vs.profile_id = uid AND arrived_at::date = d
  GROUP BY v.id, v.name, v.popularity
  LIMIT 3;

  RETURN jsonb_build_object(
    'day', to_char(d, 'DD Mon YYYY'),
    'totalMins', mins_out,
    'venues', venues_cnt,
    'encounters', encounters_cnt,
    'longestStay', jsonb_build_object(
      'mins', COALESCE(longest_mins,0),
      'venue', longest_venue
    ),
    'timeline', timeline,
    'topVenues', top_venues
  );
END;
$$;

GRANT EXECUTE ON FUNCTION build_daily_recap TO authenticated;