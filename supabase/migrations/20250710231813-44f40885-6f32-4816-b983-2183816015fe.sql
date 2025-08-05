-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add new columns to profiles table with proper defaults
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT array[]::text[],
ADD COLUMN IF NOT EXISTS custom_status text;

-- Create achievements table with proper constraints
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_type text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  -- Add unique constraint to prevent duplicate badges per user
  CONSTRAINT unique_badge_per_user UNIQUE (user_id, achievement_type),
  -- Add check constraint for valid achievement types
  CONSTRAINT chk_ach_type CHECK (achievement_type IN ('first_friend', 'venue_explorer', 'vibe_master', 'social_butterfly', 'early_adopter'))
);

-- Create user_settings table with proper structure
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid NOT NULL PRIMARY KEY,
  available_until timestamp with time zone,
  notification_preferences jsonb DEFAULT '{"push": true, "email": false}',
  privacy_settings jsonb DEFAULT '{"profile_visibility": "public", "location_sharing": true}',
  theme_preferences jsonb DEFAULT '{"dark_mode": true, "accent_color": "purple"}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements
CREATE POLICY "Users can view their own achievements" 
ON public.achievements 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow server-side function to insert achievements (security definer)
-- Users cannot directly insert achievements - only through triggers/functions

-- RLS Policies for user_settings  
CREATE POLICY "Users can access their own settings" 
ON public.user_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_settings
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_settings_updated_at();

-- Add GIST index on vibes_log(location) for ST_DWithin performance
CREATE INDEX IF NOT EXISTS vibes_log_geom_gix 
ON vibes_log USING GIST(location);

-- Create improved get_profile_stats RPC function
CREATE OR REPLACE FUNCTION public.get_profile_stats(
  target_user_id uuid,
  metres int DEFAULT 100,
  seconds int DEFAULT 3600
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  user_location geometry;
BEGIN
  -- Get user's current location
  SELECT location INTO user_location 
  FROM vibes_now 
  WHERE user_id = target_user_id;
  
  -- Build stats in single query
  SELECT jsonb_build_object(
    'friend_count', COALESCE(friend_stats.friend_count, 0),
    'crossings_7d', COALESCE(crossing_stats.crossings_7d, 0),
    'most_active_vibe', COALESCE(vibe_stats.most_active_vibe, 'unknown'),
    'days_active_this_month', COALESCE(activity_stats.days_active, 0),
    'total_achievements', COALESCE(achievement_stats.total_achievements, 0)
  ) INTO result
  FROM (
    -- Friend count (handle symmetry properly)
    SELECT COUNT(DISTINCT f.friend_id) as friend_count
    FROM friendships f
    WHERE f.user_id = target_user_id
  ) friend_stats
  CROSS JOIN (
    -- Crossings in last 7 days using PostGIS
    SELECT COUNT(DISTINCT v2.user_id) as crossings_7d
    FROM vibes_log v1
    JOIN vibes_log v2 ON (
      v1.user_id = target_user_id
      AND v2.user_id != target_user_id
      AND ST_DWithin(v1.location, v2.location, metres)
      AND abs(extract(epoch from (v1.ts - v2.ts))) <= seconds
    )
    WHERE v1.ts >= (now() - interval '7 days')
      AND v2.ts >= (now() - interval '7 days')
  ) crossing_stats
  CROSS JOIN (
    -- Most active vibe this week
    SELECT vibe as most_active_vibe
    FROM vibes_log
    WHERE user_id = target_user_id 
      AND ts >= (now() - interval '7 days')
    GROUP BY vibe
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) vibe_stats
  CROSS JOIN (
    -- Days active this month
    SELECT COUNT(DISTINCT DATE(ts)) as days_active
    FROM vibes_log
    WHERE user_id = target_user_id 
      AND ts >= date_trunc('month', now())
  ) activity_stats
  CROSS JOIN (
    -- Total achievements
    SELECT COUNT(*) as total_achievements
    FROM achievements
    WHERE user_id = target_user_id
  ) achievement_stats;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid, int, int) TO authenticated;

-- Backfill user_settings for existing users
INSERT INTO user_settings(user_id)
SELECT id FROM profiles 
ON CONFLICT DO NOTHING;