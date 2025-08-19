-- RPC function to get venues with intelligence for timeline optimization
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
  canonical_tags canonical_tag[],
  distance_meters INTEGER,
  optimal_for_time TEXT[],
  crowd_prediction JSONB,
  price_optimization JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  center_point GEOMETRY;
  day_of_week INTEGER;
  current_hour INTEGER;
BEGIN
  -- Create center point for distance calculations
  center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);
  
  -- Get day of week (0 = Sunday, 6 = Saturday)
  day_of_week := EXTRACT(DOW FROM date_context);
  
  -- Get current hour for crowd predictions
  current_hour := EXTRACT(HOUR FROM NOW());
  
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
    v.canonical_tags,
    
    -- Calculate distance in meters
    ST_Distance(v.geom::GEOGRAPHY, center_point::GEOGRAPHY)::INTEGER AS distance_meters,
    
    -- Determine optimal time slots for this venue
    CASE 
      WHEN v.categories && ARRAY['restaurant', 'food'] THEN 
        ARRAY['lunch', 'dinner']
      WHEN v.categories && ARRAY['bar', 'nightlife'] THEN 
        ARRAY['evening', 'night']
      WHEN v.categories && ARRAY['cafe', 'coffee'] THEN 
        ARRAY['breakfast', 'afternoon']
      WHEN v.categories && ARRAY['entertainment', 'activity'] THEN 
        ARRAY['afternoon', 'evening']
      ELSE 
        ARRAY['anytime']
    END AS optimal_for_time,
    
    -- Crowd prediction based on popularity_hourly and live_count
    jsonb_build_object(
      'current_level', 
      CASE 
        WHEN v.live_count > 0 THEN 'live_data'
        WHEN v.popularity_hourly IS NOT NULL AND array_length(v.popularity_hourly, 1) >= current_hour + 1 THEN
          CASE 
            WHEN v.popularity_hourly[current_hour + 1] < 30 THEN 'low'
            WHEN v.popularity_hourly[current_hour + 1] < 70 THEN 'medium'
            ELSE 'high'
          END
        ELSE 'unknown'
      END,
      'live_count', v.live_count,
      'hourly_pattern', v.popularity_hourly,
      'confidence', 
      CASE 
        WHEN v.live_count > 0 THEN 95
        WHEN v.popularity_hourly IS NOT NULL THEN 80
        ELSE 50
      END
    ) AS crowd_prediction,
    
    -- Price optimization suggestions
    jsonb_build_object(
      'tier', v.price_tier,
      'level', v.price_level,
      'happy_hour_likely', 
      CASE 
        WHEN v.categories && ARRAY['bar', 'restaurant'] THEN TRUE
        ELSE FALSE
      END,
      'lunch_specials_likely',
      CASE 
        WHEN v.categories && ARRAY['restaurant', 'food'] THEN TRUE
        ELSE FALSE
      END,
      'budget_friendly_times', 
      CASE 
        WHEN v.categories && ARRAY['bar', 'restaurant'] THEN 
          ARRAY['15:00-18:00', '21:00-23:00']  -- Happy hours
        WHEN v.categories && ARRAY['restaurant', 'food'] THEN 
          ARRAY['11:00-15:00']  -- Lunch specials
        ELSE 
          ARRAY[]::TEXT[]
      END
    ) AS price_optimization
    
  FROM venues v
  WHERE 
    -- Distance filter
    ST_DWithin(v.geom::GEOGRAPHY, center_point::GEOGRAPHY, radius_meters)
    
    -- Vibe filter (if provided)
    AND (
      vibe_filter IS NULL 
      OR v.vibe = ANY(vibe_filter)
      OR v.tags && vibe_filter
      OR EXISTS (
        SELECT 1 FROM unnest(v.canonical_tags) ct
        WHERE ct::TEXT = ANY(vibe_filter)
      )
    )
    
    -- Only include venues with reasonable data quality
    AND v.name IS NOT NULL
    AND v.lat IS NOT NULL 
    AND v.lng IS NOT NULL
    
  ORDER BY 
    -- Prioritize by distance, then by popularity/vibe score
    ST_Distance(v.geom::GEOGRAPHY, center_point::GEOGRAPHY),
    (COALESCE(v.vibe_score, 50) + COALESCE(v.popularity, 0) * 0.1) DESC
    
  LIMIT limit_count;
END;
$$;