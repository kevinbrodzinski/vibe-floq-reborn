-- Phase 2: Serendipity Engine Foundation & Algorithm
-- Create vibe pairing patterns table for resonance matching

CREATE TABLE IF NOT EXISTS public.vibe_pairing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vibe_type TEXT NOT NULL CHECK (vibe_type IN ('hype', 'chill', 'social', 'focus', 'explore', 'flowing')),
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  frequency_score DECIMAL(3,2) DEFAULT 0.0 CHECK (frequency_score >= 0.0 AND frequency_score <= 1.0),
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vibe_pairing_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for vibe pairing patterns
CREATE POLICY "Users can view their own vibe patterns" 
ON public.vibe_pairing_patterns 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Users can create their own vibe patterns" 
ON public.vibe_pairing_patterns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vibe patterns" 
ON public.vibe_pairing_patterns 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_vibe_pairing_user_time ON public.vibe_pairing_patterns(user_id, time_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_vibe_pairing_partner ON public.vibe_pairing_patterns(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_vibe_pairing_vibe_type ON public.vibe_pairing_patterns(vibe_type);

-- Function to track vibe pairings automatically
CREATE OR REPLACE FUNCTION public.track_vibe_pairing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  current_time_of_day TEXT;
  current_day_of_week INTEGER;
BEGIN
  -- Determine time of day
  current_time_of_day := CASE 
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 5 AND 11 THEN 'morning'
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 12 AND 17 THEN 'afternoon' 
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 18 AND 22 THEN 'evening'
    ELSE 'night'
  END;
  
  current_day_of_week := EXTRACT(DOW FROM NOW());

  -- Insert or update vibe pairing pattern
  INSERT INTO public.vibe_pairing_patterns (
    user_id, partner_user_id, vibe_type, time_of_day, day_of_week, 
    frequency_score, last_interaction_at
  ) VALUES (
    NEW.profile_id, 
    COALESCE(NEW.target_profile_id, NEW.other_profile_id),
    NEW.vibe::TEXT,
    current_time_of_day,
    current_day_of_week,
    1.0,
    NOW()
  )
  ON CONFLICT (user_id, partner_user_id, vibe_type, time_of_day, day_of_week) 
  DO UPDATE SET
    frequency_score = LEAST(vibe_pairing_patterns.frequency_score + 0.1, 1.0),
    last_interaction_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Updated timestamp trigger
CREATE TRIGGER update_vibe_pairing_patterns_updated_at
  BEFORE UPDATE ON public.vibe_pairing_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to calculate resonance score between two users  
CREATE OR REPLACE FUNCTION public.calculate_resonance_score(
  p_user_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  shared_interests_score DECIMAL := 0.0;
  temporal_compatibility_score DECIMAL := 0.0;
  spatial_resonance_score DECIMAL := 0.0;
  social_chemistry_score DECIMAL := 0.0;
  vibe_pairing_score DECIMAL := 0.0;
  total_score DECIMAL;
  result JSONB;
BEGIN
  -- 1. Shared Interests & Vibes (35% weight)
  SELECT COALESCE(AVG(vpp.frequency_score), 0.0) * 35
  INTO shared_interests_score
  FROM vibe_pairing_patterns vpp
  WHERE vpp.user_id = p_user_id AND vpp.partner_user_id = p_partner_id;

  -- 2. Temporal Compatibility (25% weight) - based on overlapping active times
  WITH user_times AS (
    SELECT DISTINCT time_of_day, day_of_week
    FROM vibe_pairing_patterns 
    WHERE user_id = p_user_id
  ),
  partner_times AS (
    SELECT DISTINCT time_of_day, day_of_week
    FROM vibe_pairing_patterns 
    WHERE user_id = p_partner_id
  ),
  overlap AS (
    SELECT COUNT(*) as overlap_count
    FROM user_times ut
    INNER JOIN partner_times pt ON ut.time_of_day = pt.time_of_day 
      AND ut.day_of_week = pt.day_of_week
  )
  SELECT COALESCE(overlap_count::DECIMAL / 28 * 25, 0.0) -- 28 = 4 times * 7 days max
  INTO temporal_compatibility_score
  FROM overlap;

  -- 3. Spatial Resonance (25% weight) - based on venue overlaps
  WITH user_venues AS (
    SELECT venue_id, COUNT(*) as visit_count
    FROM venue_stays vs1
    WHERE vs1.profile_id = p_user_id 
      AND vs1.arrived_at >= NOW() - INTERVAL '30 days'
    GROUP BY venue_id
  ),
  partner_venues AS (
    SELECT venue_id, COUNT(*) as visit_count  
    FROM venue_stays vs2
    WHERE vs2.profile_id = p_partner_id
      AND vs2.arrived_at >= NOW() - INTERVAL '30 days'
    GROUP BY venue_id
  ),
  venue_overlap AS (
    SELECT COUNT(*) as shared_venues,
           SUM(LEAST(uv.visit_count, pv.visit_count)) as overlap_strength
    FROM user_venues uv
    INNER JOIN partner_venues pv ON uv.venue_id = pv.venue_id
  )
  SELECT COALESCE(LEAST(shared_venues::DECIMAL / 10 * 25, 25.0), 0.0)
  INTO spatial_resonance_score
  FROM venue_overlap;

  -- 4. Social Chemistry (15% weight) - mutual friends and interactions
  WITH mutual_friends AS (
    SELECT COUNT(*) as mutual_count
    FROM friendships f1
    JOIN friendships f2 ON (
      (f1.profile_low = f2.profile_low OR f1.profile_low = f2.profile_high OR
       f1.profile_high = f2.profile_low OR f1.profile_high = f2.profile_high)
      AND f1.profile_low != f2.profile_low 
      AND f1.profile_high != f2.profile_high
    )
    WHERE (f1.profile_low = p_user_id OR f1.profile_high = p_user_id)
      AND (f2.profile_low = p_partner_id OR f2.profile_high = p_partner_id)
      AND f1.friend_state = 'accepted' 
      AND f2.friend_state = 'accepted'
  )
  SELECT COALESCE(LEAST(mutual_count::DECIMAL / 20 * 15, 15.0), 0.0)
  INTO social_chemistry_score
  FROM mutual_friends;

  -- Calculate total resonance score
  total_score := shared_interests_score + temporal_compatibility_score + 
                 spatial_resonance_score + social_chemistry_score;

  -- Build result JSON
  result := jsonb_build_object(
    'resonanceScore', ROUND(total_score, 1),
    'factors', jsonb_build_object(
      'sharedInterests', ROUND(shared_interests_score, 1),
      'temporalCompatibility', ROUND(temporal_compatibility_score, 1), 
      'spatialResonance', ROUND(spatial_resonance_score, 1),
      'socialChemistry', ROUND(social_chemistry_score, 1)
    )
  );

  RETURN result;
END;
$$;