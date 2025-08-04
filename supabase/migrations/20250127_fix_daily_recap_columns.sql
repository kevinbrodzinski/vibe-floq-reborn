-- Fix Daily Recap Column Name Mismatches
-- This migration fixes the user_id vs profile_id column inconsistencies

-- Update the build_daily_recap function to use correct column names
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION build_daily_recap TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_venue_stays_profile_date 
ON venue_stays (profile_id, arrived_at::date);

CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_date 
ON proximity_events (profile_id_a, event_ts::date);

CREATE INDEX IF NOT EXISTS idx_crossed_paths_date 
ON crossed_paths (encounter_date);

-- Create a function to log auto check-in attempts for better analytics
CREATE TABLE IF NOT EXISTS auto_checkin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  detection_method text CHECK (detection_method IN ('enhanced', 'gps_fallback', 'manual')),
  confidence_score numeric(3,2),
  error_reason text,
  location_lat numeric,
  location_lng numeric,
  location_accuracy integer
);

-- Add RLS policy
ALTER TABLE auto_checkin_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own check-in attempts" 
ON auto_checkin_attempts FOR SELECT 
USING (auth.uid() = profile_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_checkin_attempts_profile_date 
ON auto_checkin_attempts (profile_id, attempted_at::date);

CREATE INDEX IF NOT EXISTS idx_auto_checkin_attempts_success 
ON auto_checkin_attempts (profile_id, success, attempted_at);

-- Function to get enhanced auto check-in metrics
CREATE OR REPLACE FUNCTION get_auto_checkin_metrics(uid uuid, d date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_attempts int;
  successful_attempts int;
  enhanced_detections int;
  gps_fallback_detections int;
  avg_confidence numeric;
BEGIN
  -- Get auto check-in attempt statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*) FILTER (WHERE detection_method = 'enhanced'),
    COUNT(*) FILTER (WHERE detection_method = 'gps_fallback'),
    AVG(confidence_score) FILTER (WHERE confidence_score IS NOT NULL)
  INTO 
    total_attempts,
    successful_attempts,
    enhanced_detections,
    gps_fallback_detections,
    avg_confidence
  FROM auto_checkin_attempts
  WHERE profile_id = uid 
    AND attempted_at::date = d;

  -- If no attempts logged, estimate from venue_stays
  IF total_attempts = 0 THEN
    SELECT COUNT(*)
    INTO successful_attempts
    FROM venue_stays
    WHERE profile_id = uid
      AND arrived_at::date = d;
    
    total_attempts := successful_attempts;
    enhanced_detections := FLOOR(successful_attempts * 0.7);
    gps_fallback_detections := successful_attempts - enhanced_detections;
    avg_confidence := 0.8;
  END IF;

  RETURN jsonb_build_object(
    'total', COALESCE(total_attempts, 0),
    'successful', COALESCE(successful_attempts, 0),
    'failureRate', CASE 
      WHEN total_attempts > 0 THEN 
        ROUND((total_attempts - successful_attempts)::numeric / total_attempts * 100, 1)
      ELSE 0 
    END,
    'averageConfidence', COALESCE(avg_confidence, 0),
    'detectionMethods', jsonb_build_object(
      'enhanced', COALESCE(enhanced_detections, 0),
      'gps_fallback', COALESCE(gps_fallback_detections, 0)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_auto_checkin_metrics TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION build_daily_recap IS 'Generates daily recap data with corrected column names for venue_stays and v_time_in_venue_daily';
COMMENT ON FUNCTION get_auto_checkin_metrics IS 'Gets enhanced auto check-in metrics for daily recap analytics';
COMMENT ON TABLE auto_checkin_attempts IS 'Logs all auto check-in attempts for analytics and debugging';