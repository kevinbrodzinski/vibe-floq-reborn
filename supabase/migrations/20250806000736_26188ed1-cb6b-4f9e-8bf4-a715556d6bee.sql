-- Phase 2: People Discovery Stack Data Infrastructure (Fixed Column Names)
-- Using correct column names: arrived_at instead of visited_at, user_id instead of profile_id

BEGIN;

-- 1. Performance index for venue visits
CREATE INDEX IF NOT EXISTS idx_venue_visits_user_recent
  ON public.venue_visits (user_id, arrived_at DESC);

-- 2. Index for crossed paths performance  
CREATE INDEX IF NOT EXISTS idx_crossed_paths_users_time
  ON public.crossed_paths USING GIST (user_a, user_b, created_at);

-- 3. Enhanced get_vibe_breakdown function
CREATE OR REPLACE FUNCTION public.get_vibe_breakdown(me_id uuid, friend_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  overall_score numeric := 50.0;
  venue_dna_score numeric := 50.0;
  time_rhythm_score numeric := 50.0;
  social_pattern_score numeric := 50.0;
  shared_venues_count integer := 0;
  total_unique_venues integer := 1; -- avoid division by zero
BEGIN
  -- Overall score: venue-based similarity
  SELECT 
    COUNT(DISTINCT CASE WHEN v1.venue_id IS NOT NULL AND v2.venue_id IS NOT NULL THEN v1.venue_id END),
    COUNT(DISTINCT COALESCE(v1.venue_id, v2.venue_id))
  INTO shared_venues_count, total_unique_venues
  FROM venue_visits v1
  FULL OUTER JOIN venue_visits v2 
    ON v1.venue_id = v2.venue_id
   AND v1.user_id = me_id  
   AND v2.user_id = friend_id
  WHERE COALESCE(v1.arrived_at, v2.arrived_at) > now() - interval '30 days';
  
  overall_score := LEAST(100.0, (shared_venues_count::numeric / GREATEST(total_unique_venues, 1) * 100.0));

  -- Venue DNA: shared venue categories and types
  SELECT COALESCE(COUNT(DISTINCT v1.venue_id) * 15.0, 0)
  INTO venue_dna_score
  FROM venue_visits v1
  JOIN venue_visits v2 ON v1.venue_id = v2.venue_id
  JOIN venues v ON v.id = v1.venue_id
  WHERE v1.user_id = me_id
    AND v2.user_id = friend_id
    AND v1.arrived_at > now() - interval '30 days'
    AND v2.arrived_at > now() - interval '30 days'
  LIMIT 5;
  
  venue_dna_score := LEAST(100.0, venue_dna_score);

  -- Time Rhythm: fixed midnight wrapping with modulo logic
  SELECT COALESCE(AVG(
    CASE WHEN ((EXTRACT(hour FROM v1.arrived_at)::int -
                EXTRACT(hour FROM v2.arrived_at)::int + 24) % 24) <= 3
         THEN 80 ELSE 20 END), 50.0)
  INTO time_rhythm_score
  FROM venue_visits v1
  JOIN venue_visits v2 
    ON v1.user_id = me_id
   AND v2.user_id = friend_id
   AND v1.arrived_at > now() - interval '14 days'
   AND v2.arrived_at > now() - interval '14 days'
  FETCH FIRST 20 ROWS ONLY;

  -- Social Pattern: floq participation overlap
  SELECT COALESCE(COUNT(DISTINCT fp1.floq_id) * 12.0, 0)
  INTO social_pattern_score
  FROM floq_participants fp1
  JOIN floq_participants fp2 ON fp1.floq_id = fp2.floq_id
  WHERE fp1.profile_id = me_id
    AND fp2.profile_id = friend_id
    AND fp1.joined_at > now() - interval '60 days'
  LIMIT 8;
  
  social_pattern_score := LEAST(100.0, social_pattern_score);

  RETURN jsonb_build_object(
    'overall', ROUND(overall_score, 1),
    'venueDNA', ROUND(venue_dna_score, 1),
    'timeRhythm', ROUND(time_rhythm_score, 1),
    'socialPattern', ROUND(social_pattern_score, 1)
  );
END;
$$;

-- 4. Enhanced get_common_venues function
CREATE OR REPLACE FUNCTION public.get_common_venues(me_id uuid, friend_id uuid)
RETURNS TABLE(venue_id uuid, name text, category text, overlap_visits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as venue_id,
    v.name,
    COALESCE(array_to_string(v.categories, ', '), 'unknown') as category,
    COUNT(*)::integer as overlap_visits
  FROM venue_visits v1
  JOIN venue_visits v2 ON v1.venue_id = v2.venue_id
  JOIN venues v ON v.id = v1.venue_id
  WHERE v1.user_id = me_id
    AND v2.user_id = friend_id
    AND v1.arrived_at > now() - interval '60 days'
    AND v2.arrived_at > now() - interval '60 days'
  GROUP BY v.id, v.name, v.categories
  ORDER BY overlap_visits DESC, v.name
  LIMIT 10;
END;
$$;

-- 5. Enhanced get_plan_suggestions function
CREATE OR REPLACE FUNCTION public.get_plan_suggestions(me_id uuid, friend_id uuid, limit_n integer DEFAULT 3)
RETURNS TABLE(id text, title text, vibe text, venue_type text, estimated_duration text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ('suggestion-' || gen_random_uuid()::text) as id,
    suggestion.title,
    suggestion.vibe,
    suggestion.venue_type,
    suggestion.estimated_duration
  FROM (
    VALUES 
      ('Grab coffee and catch up', 'social', 'cafe', '45-60 minutes'),
      ('Walk through the park', 'chill', 'outdoor', '30-45 minutes'),
      ('Try that new restaurant', 'social', 'restaurant', '60-90 minutes'),
      ('Hit up a local market', 'energetic', 'market', '60 minutes'),
      ('Check out live music', 'excited', 'venue', '90-120 minutes'),
      ('Explore a museum', 'focused', 'cultural', '90 minutes'),
      ('Go for drinks', 'social', 'bar', '60-90 minutes')
  ) AS suggestion(title, vibe, venue_type, estimated_duration)
  ORDER BY random()
  LIMIT limit_n;
END;
$$;

-- 6. Enhanced get_crossed_paths_stats function  
CREATE OR REPLACE FUNCTION public.get_crossed_paths_stats(me_id uuid, friend_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  week_count integer := 0;
  last_venue_name text := '';
  last_encounter_time timestamptz;
BEGIN
  -- Count crossings in last 7 days
  SELECT COUNT(*)
  INTO week_count
  FROM crossed_paths cp
  WHERE (cp.user_a = me_id AND cp.user_b = friend_id)
     OR (cp.user_a = friend_id AND cp.user_b = me_id)
    AND cp.created_at > now() - interval '7 days';

  -- Get most recent encounter details
  SELECT 
    COALESCE(v.name, 'Unknown location'),
    cp.created_at
  INTO last_venue_name, last_encounter_time
  FROM crossed_paths cp
  LEFT JOIN venues v ON v.id = cp.venue_id
  WHERE (cp.user_a = me_id AND cp.user_b = friend_id)
     OR (cp.user_a = friend_id AND cp.user_b = me_id)
  ORDER BY cp.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'countWeek', week_count,
    'lastVenue', COALESCE(last_venue_name, 'No recent encounters'),
    'lastAt', COALESCE(last_encounter_time, now() - interval '30 days'),
    'distance', NULL -- Will be calculated client-side based on current location
  );
END;
$$;

-- 7. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION
  public.get_vibe_breakdown(uuid, uuid),
  public.get_common_venues(uuid, uuid), 
  public.get_plan_suggestions(uuid, uuid, integer),
  public.get_crossed_paths_stats(uuid, uuid)
TO authenticated;

COMMIT;