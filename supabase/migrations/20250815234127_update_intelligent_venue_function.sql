-- Update RPC function for intelligent venue recommendations with proper plan_participants integration
CREATE OR REPLACE FUNCTION get_venues_with_intelligence(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000,
  limit_count INTEGER DEFAULT 100,
  vibe_filter TEXT[] DEFAULT NULL,
  date_context DATE DEFAULT CURRENT_DATE,
  time_window JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  categories TEXT[],
  cuisines TEXT[],
  vibe TEXT,
  vibe_score NUMERIC,
  popularity INTEGER,
  popularity_hourly INTEGER[],
  live_count INTEGER,
  price_tier TEXT,
  price_level INTEGER,
  rating NUMERIC,
  rating_count INTEGER,
  photo_url TEXT,
  hours JSONB,
  tags TEXT[],
  canonical_tags TEXT[],
  distance_meters NUMERIC,
  embedding VECTOR
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  start_hour INTEGER;
  end_hour INTEGER;
BEGIN
  -- Extract time window if provided
  IF time_window IS NOT NULL THEN
    start_hour := COALESCE((time_window->>'start')::TEXT::TIME::INTEGER, 0);
    end_hour := COALESCE((time_window->>'end')::TEXT::TIME::INTEGER, 23);
  ELSE
    start_hour := 0;
    end_hour := 23;
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.lat,
    v.lng,
    v.address,
    v.categories,
    v.cuisines,
    v.vibe,
    v.vibe_score,
    v.popularity,
    v.popularity_hourly,
    v.live_count,
    v.price_tier::TEXT,
    v.price_level,
    v.rating,
    v.rating_count,
    v.photo_url,
    v.hours,
    v.tags,
    ARRAY(SELECT unnest(v.canonical_tags)::TEXT) as canonical_tags,
    ST_Distance(
      ST_MakePoint(center_lng, center_lat)::geography,
      ST_MakePoint(v.lng, v.lat)::geography
    )::NUMERIC as distance_meters,
    v.embedding
  FROM venues v
  WHERE 
    -- Distance filter
    ST_DWithin(
      ST_MakePoint(center_lng, center_lat)::geography,
      ST_MakePoint(v.lng, v.lat)::geography,
      radius_meters
    )
    -- Vibe filter
    AND (
      vibe_filter IS NULL 
      OR v.vibe = ANY(vibe_filter)
    )
    -- Basic quality filters
    AND v.popularity > 0
    AND v.vibe_score > 0
  ORDER BY 
    -- Prioritize by distance and popularity
    (ST_Distance(
      ST_MakePoint(center_lng, center_lat)::geography,
      ST_MakePoint(v.lng, v.lat)::geography
    ) / 1000.0) + (100 - COALESCE(v.popularity, 0)) / 100.0
  LIMIT limit_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_venues_with_intelligence TO authenticated;
GRANT EXECUTE ON FUNCTION get_venues_with_intelligence TO anon;

-- Add helper function to get plan participant insights
CREATE OR REPLACE FUNCTION get_plan_participant_insights(
  plan_id_param UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_participants', COUNT(*),
    'accepted_count', COUNT(*) FILTER (WHERE rsvp_status = 'accepted'),
    'pending_count', COUNT(*) FILTER (WHERE rsvp_status = 'pending'),
    'maybe_count', COUNT(*) FILTER (WHERE rsvp_status = 'maybe'),
    'declined_count', COUNT(*) FILTER (WHERE rsvp_status = 'declined'),
    'guest_count', COUNT(*) FILTER (WHERE is_guest = true),
    'member_count', COUNT(*) FILTER (WHERE is_guest = false),
    'response_rate', CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE responded_at IS NOT NULL))::NUMERIC / COUNT(*) * 100, 2)
      ELSE 0 
    END,
    'acceptance_rate', CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE rsvp_status = 'accepted'))::NUMERIC / COUNT(*) * 100, 2)
      ELSE 0 
    END,
    'has_guests', COUNT(*) FILTER (WHERE is_guest = true) > 0,
    'is_large_group', COUNT(*) FILTER (WHERE rsvp_status IN ('accepted', 'maybe')) >= 6,
    'is_intimate_group', COUNT(*) FILTER (WHERE rsvp_status IN ('accepted', 'maybe')) <= 3
  ) INTO result
  FROM plan_participants 
  WHERE plan_id = plan_id_param;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant permissions for participant insights
GRANT EXECUTE ON FUNCTION get_plan_participant_insights TO authenticated;

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_venues_vibe_popularity ON venues(vibe, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_venues_distance_popularity ON venues USING GIST(ST_MakePoint(lng, lat)) WHERE popularity > 0;
CREATE INDEX IF NOT EXISTS idx_plan_participants_rsvp_status ON plan_participants(plan_id, rsvp_status);
CREATE INDEX IF NOT EXISTS idx_plan_participants_response_tracking ON plan_participants(plan_id, responded_at, rsvp_status);

-- Update trigger function to handle plan_participants properly
CREATE OR REPLACE FUNCTION trigger_afterglow_stale_plan() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Mark any related afterglow records as stale when participants change
  UPDATE afterglow_summaries 
  SET is_stale = true 
  WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- Also invalidate any cached plan insights
  -- This could be extended to invalidate specific cache keys
  
  RETURN COALESCE(NEW, OLD);
END;
$$;