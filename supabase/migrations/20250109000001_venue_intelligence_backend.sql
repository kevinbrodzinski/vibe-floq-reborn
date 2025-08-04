-- Venue Intelligence Backend Migration
-- This migration adds the necessary database functions and tables for the venue intelligence system

-- 1. Create venues_within_radius function for spatial queries
CREATE OR REPLACE FUNCTION venues_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_km double precision DEFAULT 5.0
)
RETURNS TABLE (
  id uuid,
  provider text,
  provider_id text,
  name text,
  slug text,
  lat double precision,
  lng double precision,
  address text,
  categories text[],
  rating numeric,
  photo_url text,
  updated_at timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    v.id,
    v.provider,
    v.provider_id,
    v.name,
    v.slug,
    v.lat,
    v.lng,
    v.address,
    v.categories,
    v.rating,
    v.photo_url,
    v.updated_at,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      v.geom
    ) / 1000.0 as distance_km
  FROM venues v
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
    v.geom,
    radius_km * 1000
  )
  ORDER BY distance_km;
$$;

-- 2. Create venue_events table for real-time events
CREATE TABLE IF NOT EXISTS public.venue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  event_type text DEFAULT 'general',
  capacity integer,
  price_range text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create venue_offers table for special offers
CREATE TABLE IF NOT EXISTS public.venue_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  offer_type text DEFAULT 'discount', -- discount, special, happy_hour, etc.
  discount_percentage integer,
  discount_amount numeric,
  valid_from timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  active boolean DEFAULT true,
  conditions text,
  created_at timestamptz DEFAULT now()
);

-- 4. Create user_venue_interactions table for ML training
CREATE TABLE IF NOT EXISTS public.user_venue_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  interaction_type text NOT NULL, -- view, click, favorite, share, check_in
  interaction_count integer DEFAULT 1,
  last_interaction_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, venue_id, interaction_type)
);

-- 5. Create venue_intelligence_cache table for performance
CREATE TABLE IF NOT EXISTS public.venue_intelligence_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. Create venue_recommendation_analytics table
CREATE TABLE IF NOT EXISTS public.venue_recommendation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  recommendation_id text NOT NULL,
  event_type text NOT NULL, -- view, click, favorite, visit, share
  confidence_score numeric,
  vibe_match_score numeric,
  social_proof_score numeric,
  crowd_intelligence_score numeric,
  proximity_score numeric,
  novelty_score numeric,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 7. Add missing price_tier column to venues if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'price_tier'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN price_tier text DEFAULT '$$';
  END IF;
END $$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_events_venue_id_time ON public.venue_events(venue_id, start_time);
CREATE INDEX IF NOT EXISTS idx_venue_offers_venue_id_active ON public.venue_offers(venue_id, active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_venue_interactions_profile_venue ON public.user_venue_interactions(profile_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_user_venue_interactions_type_time ON public.user_venue_interactions(interaction_type, last_interaction_at);
CREATE INDEX IF NOT EXISTS idx_venue_intelligence_cache_key_expires ON public.venue_intelligence_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_venue_recommendation_analytics_user_time ON public.venue_recommendation_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_venue_recommendation_analytics_venue_event ON public.venue_recommendation_analytics(venue_id, event_type);

-- 9. Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.venue_intelligence_cache 
  WHERE expires_at < now();
$$;

-- 10. Create function to upsert user venue interactions
CREATE OR REPLACE FUNCTION upsert_venue_interaction(
  p_profile_id uuid,
  p_venue_id uuid,
  p_interaction_type text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_venue_interactions (
    profile_id, 
    venue_id, 
    interaction_type, 
    interaction_count, 
    last_interaction_at,
    metadata
  ) VALUES (
    p_profile_id, 
    p_venue_id, 
    p_interaction_type, 
    1, 
    now(),
    p_metadata
  )
  ON CONFLICT (profile_id, venue_id, interaction_type) 
  DO UPDATE SET 
    interaction_count = user_venue_interactions.interaction_count + 1,
    last_interaction_at = now(),
    metadata = p_metadata;
END;
$$;

-- 11. Create function to get user behavior patterns for ML
CREATE OR REPLACE FUNCTION get_user_behavior_patterns(
  p_user_id uuid,
  p_days_back integer DEFAULT 180
)
RETURNS TABLE (
  venue_id uuid,
  venue_categories text[],
  venue_rating numeric,
  visit_count bigint,
  avg_stay_duration interval,
  preferred_times integer[],
  preferred_days integer[],
  interaction_types text[]
)
LANGUAGE sql
STABLE
AS $$
  WITH venue_visits AS (
    SELECT 
      vs.venue_id,
      v.categories,
      v.rating,
      COUNT(*) as visit_count,
      AVG(vs.departed_at - vs.arrived_at) as avg_stay_duration,
      ARRAY_AGG(DISTINCT EXTRACT(hour FROM vs.arrived_at)::integer) as preferred_times,
      ARRAY_AGG(DISTINCT EXTRACT(dow FROM vs.arrived_at)::integer) as preferred_days
    FROM venue_stays vs
    JOIN venues v ON vs.venue_id = v.id
    WHERE vs.profile_id = p_user_id
      AND vs.arrived_at >= now() - (p_days_back || ' days')::interval
    GROUP BY vs.venue_id, v.categories, v.rating
  ),
  venue_interactions AS (
    SELECT 
      venue_id,
      ARRAY_AGG(DISTINCT interaction_type) as interaction_types
    FROM user_venue_interactions
    WHERE profile_id = p_user_id
      AND last_interaction_at >= now() - (p_days_back || ' days')::interval
    GROUP BY venue_id
  )
  SELECT 
    vv.venue_id,
    vv.categories as venue_categories,
    vv.rating as venue_rating,
    vv.visit_count,
    vv.avg_stay_duration,
    vv.preferred_times,
    vv.preferred_days,
    COALESCE(vi.interaction_types, ARRAY[]::text[]) as interaction_types
  FROM venue_visits vv
  LEFT JOIN venue_interactions vi ON vv.venue_id = vi.venue_id;
$$;

-- 12. Create function to get friend network venue data
CREATE OR REPLACE FUNCTION get_friend_network_venue_data(
  p_user_id uuid,
  p_venue_id uuid DEFAULT NULL
)
RETURNS TABLE (
  friend_id uuid,
  friend_name text,
  friend_avatar text,
  venue_id uuid,
  venue_name text,
  visit_count bigint,
  last_visit timestamptz,
  avg_rating numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN f.user_a = p_user_id THEN f.user_b
        ELSE f.user_a
      END as friend_id
    FROM friends f
    WHERE (f.user_a = p_user_id OR f.user_b = p_user_id)
      AND f.status = 'accepted'
  )
  SELECT 
    uf.friend_id,
    p.display_name as friend_name,
    p.avatar_url as friend_avatar,
    vs.venue_id,
    v.name as venue_name,
    COUNT(*) as visit_count,
    MAX(vs.arrived_at) as last_visit,
    AVG(COALESCE(v.rating, 4.0)) as avg_rating
  FROM user_friends uf
  JOIN profiles p ON uf.friend_id = p.id
  JOIN venue_stays vs ON uf.friend_id = vs.profile_id
  JOIN venues v ON vs.venue_id = v.id
  WHERE (p_venue_id IS NULL OR vs.venue_id = p_venue_id)
    AND vs.arrived_at >= now() - interval '90 days'
  GROUP BY uf.friend_id, p.display_name, p.avatar_url, vs.venue_id, v.name;
$$;

-- 13. Enable RLS on new tables
ALTER TABLE public.venue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venue_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_recommendation_analytics ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
-- Venue events: public read
CREATE POLICY "venue_events_public_read" ON public.venue_events
FOR SELECT USING (true);

-- Venue offers: public read for active offers
CREATE POLICY "venue_offers_public_read" ON public.venue_offers
FOR SELECT USING (active = true AND expires_at > now());

-- User venue interactions: users can only see their own
CREATE POLICY "user_venue_interactions_own_data" ON public.user_venue_interactions
FOR ALL USING (profile_id = auth.uid());

-- Venue intelligence cache: service role only
CREATE POLICY "venue_intelligence_cache_service_only" ON public.venue_intelligence_cache
FOR ALL USING (false);

-- Venue recommendation analytics: users can only see their own
CREATE POLICY "venue_recommendation_analytics_own_data" ON public.venue_recommendation_analytics
FOR ALL USING (user_id = auth.uid());

-- 15. Grant permissions
GRANT ALL ON public.venue_events TO postgres, supabase_admin;
GRANT ALL ON public.venue_offers TO postgres, supabase_admin;
GRANT ALL ON public.user_venue_interactions TO postgres, supabase_admin;
GRANT ALL ON public.venue_intelligence_cache TO postgres, supabase_admin;
GRANT ALL ON public.venue_recommendation_analytics TO postgres, supabase_admin;

GRANT SELECT ON public.venue_events TO anon, authenticated;
GRANT SELECT ON public.venue_offers TO anon, authenticated;
GRANT ALL ON public.user_venue_interactions TO authenticated;
GRANT ALL ON public.venue_recommendation_analytics TO authenticated;

-- 16. Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_venue_events_updated_at 
  BEFORE UPDATE ON public.venue_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. Create a scheduled job to clean up expired cache (if pg_cron is available)
-- This would typically be done via a cron job or scheduled function
-- For now, we'll just create the function and document the need for scheduling

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Should be run periodically (e.g., every hour) to clean up expired cache entries';

-- 18. Add some sample data for testing (optional)
-- Insert sample venue events
INSERT INTO public.venue_events (venue_id, name, description, start_time, end_time, event_type) 
SELECT 
  v.id,
  'Happy Hour',
  'Special drinks and appetizers',
  now() + interval '2 hours',
  now() + interval '5 hours',
  'happy_hour'
FROM venues v 
WHERE v.categories && ARRAY['bar', 'restaurant']
LIMIT 5
ON CONFLICT DO NOTHING;

-- Insert sample venue offers
INSERT INTO public.venue_offers (venue_id, title, description, offer_type, discount_percentage, expires_at)
SELECT 
  v.id,
  '20% Off Dinner',
  'Get 20% off your dinner order',
  'discount',
  20,
  now() + interval '7 days'
FROM venues v 
WHERE v.categories && ARRAY['restaurant']
LIMIT 3
ON CONFLICT DO NOTHING;