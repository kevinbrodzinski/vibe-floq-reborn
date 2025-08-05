-- Add HSL columns to track vibe colors
ALTER TABLE public.user_vibe_states
  ADD COLUMN IF NOT EXISTS vibe_h real,
  ADD COLUMN IF NOT EXISTS vibe_s real,
  ADD COLUMN IF NOT EXISTS vibe_l real;

ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS vibe_h real,
  ADD COLUMN IF NOT EXISTS vibe_s real,
  ADD COLUMN IF NOT EXISTS vibe_l real;

-- Update user_vibe_states with default HSL values
UPDATE public.user_vibe_states 
SET vibe_h = CASE vibe_tag
  WHEN 'chill' THEN 200.0
  WHEN 'energetic' THEN 60.0  
  WHEN 'romantic' THEN 330.0
  WHEN 'wild' THEN 280.0
  WHEN 'cozy' THEN 20.0
  WHEN 'deep' THEN 180.0
  ELSE 200.0
END,
vibe_s = CASE vibe_tag
  WHEN 'chill' THEN 0.60
  WHEN 'energetic' THEN 0.80
  WHEN 'romantic' THEN 0.70  
  WHEN 'wild' THEN 0.90
  WHEN 'cozy' THEN 0.50
  WHEN 'deep' THEN 0.80
  ELSE 0.60
END,
vibe_l = CASE vibe_tag
  WHEN 'chill' THEN 0.70
  WHEN 'energetic' THEN 0.80
  WHEN 'romantic' THEN 0.80
  WHEN 'wild' THEN 0.60  
  WHEN 'cozy' THEN 0.80
  WHEN 'deep' THEN 0.50
  ELSE 0.70
END
WHERE vibe_h IS NULL;

-- Update vibes_now with default HSL values  
UPDATE public.vibes_now
SET vibe_h = CASE vibe
  WHEN 'chill' THEN 200.0
  WHEN 'energetic' THEN 60.0
  WHEN 'romantic' THEN 330.0
  WHEN 'wild' THEN 280.0
  WHEN 'cozy' THEN 20.0
  WHEN 'deep' THEN 180.0
  ELSE 200.0
END,
vibe_s = CASE vibe
  WHEN 'chill' THEN 0.60
  WHEN 'energetic' THEN 0.80
  WHEN 'romantic' THEN 0.70
  WHEN 'wild' THEN 0.90
  WHEN 'cozy' THEN 0.50
  WHEN 'deep' THEN 0.80
  ELSE 0.60
END,
vibe_l = CASE vibe
  WHEN 'chill' THEN 0.70
  WHEN 'energetic' THEN 0.80
  WHEN 'romantic' THEN 0.80
  WHEN 'wild' THEN 0.60
  WHEN 'cozy' THEN 0.80
  WHEN 'deep' THEN 0.50
  ELSE 0.70
END
WHERE vibe_h IS NULL;

-- Fix unique constraint for user proximity events
DROP INDEX IF EXISTS uniq_prox_daily_idx;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_prox_daily_idx
  ON public.user_proximity_events (
       LEAST(user_a_id, user_b_id),
       GREATEST(user_a_id, user_b_id),
       date_trunc('day', started_at)
  );

-- Refresh materialized view
REFRESH MATERIALIZED VIEW public.vibe_clusters;