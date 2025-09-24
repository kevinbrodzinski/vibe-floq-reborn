-- Add test activity data to make venues look more realistic

-- First, let's add some venue live presence data (people currently at venues)
INSERT INTO public.venue_live_presence (venue_id, profile_id, vibe, last_heartbeat, expires_at)
SELECT 
  v.id as venue_id,
  -- Use existing profile IDs from profiles table
  (SELECT id FROM public.profiles ORDER BY random() LIMIT 1) as profile_id,
  (ARRAY['chill', 'social', 'energetic', 'focused', 'excited'])[floor(random() * 5 + 1)]::public.vibe_enum as vibe,
  now() - (random() * interval '30 minutes') as last_heartbeat,
  now() + interval '2 hours' as expires_at
FROM public.venues v
WHERE v.id IN (
  SELECT id FROM public.venues 
  ORDER BY random() 
  LIMIT 15  -- Add live presence to 15 random venues
)
ON CONFLICT (venue_id, profile_id) DO NOTHING;

-- Add more live presence entries (multiple people per venue)
INSERT INTO public.venue_live_presence (venue_id, profile_id, vibe, last_heartbeat, expires_at)
SELECT 
  v.id as venue_id,
  -- Different profile ID for second person
  (SELECT id FROM public.profiles WHERE id != (
    SELECT profile_id FROM public.venue_live_presence vlp 
    WHERE vlp.venue_id = v.id LIMIT 1
  ) ORDER BY random() LIMIT 1) as profile_id,
  (ARRAY['chill', 'social', 'energetic', 'focused', 'excited'])[floor(random() * 5 + 1)]::public.vibe_enum as vibe,
  now() - (random() * interval '45 minutes') as last_heartbeat,
  now() + interval '90 minutes' as expires_at
FROM public.venues v
WHERE v.id IN (
  SELECT venue_id FROM public.venue_live_presence 
  ORDER BY random() 
  LIMIT 8  -- Add second person to 8 venues
)
ON CONFLICT (venue_id, profile_id) DO NOTHING;

-- Update venue popularity scores to be more realistic
UPDATE public.venues 
SET popularity = floor(random() * 80 + 10)  -- Random popularity between 10-90
WHERE id IN (SELECT id FROM public.venues LIMIT 50);

-- Update vibe scores to be more varied
UPDATE public.venues 
SET vibe_score = (
  CASE 
    WHEN random() < 0.3 THEN floor(random() * 40 + 20)  -- Low energy venues (20-60)
    WHEN random() < 0.7 THEN floor(random() * 30 + 50)  -- Medium energy venues (50-80)
    ELSE floor(random() * 20 + 80)  -- High energy venues (80-100)
  END
)
WHERE id IN (SELECT id FROM public.venues LIMIT 50);

-- Add some venue interaction history
INSERT INTO public.user_venue_interactions (profile_id, venue_id, interaction_type, interaction_count, last_interaction_at)
SELECT 
  (SELECT id FROM public.profiles ORDER BY random() LIMIT 1) as profile_id,
  v.id as venue_id,
  (ARRAY['check_in', 'favorite', 'view', 'share'])[floor(random() * 4 + 1)]::text as interaction_type,
  floor(random() * 10 + 1) as interaction_count,
  now() - (random() * interval '7 days') as last_interaction_at
FROM public.venues v
ORDER BY random()
LIMIT 30  -- Add interactions for 30 random venues
ON CONFLICT (profile_id, venue_id, interaction_type) 
DO UPDATE SET 
  interaction_count = user_venue_interactions.interaction_count + EXCLUDED.interaction_count,
  last_interaction_at = EXCLUDED.last_interaction_at;