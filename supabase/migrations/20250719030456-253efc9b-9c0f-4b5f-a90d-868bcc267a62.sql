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
  WHEN 'hype' THEN 60.0  
  WHEN 'romantic' THEN 330.0
  WHEN 'weird' THEN 280.0
  WHEN 'down' THEN 240.0
  WHEN 'flowing' THEN 180.0
  WHEN 'curious' THEN 120.0
  WHEN 'social' THEN 30.0
  WHEN 'solo' THEN 270.0
  WHEN 'open' THEN 150.0
  ELSE 200.0
END,
vibe_s = CASE vibe_tag
  WHEN 'chill' THEN 0.60
  WHEN 'hype' THEN 0.80
  WHEN 'romantic' THEN 0.70  
  WHEN 'weird' THEN 0.90
  WHEN 'down' THEN 0.50
  WHEN 'flowing' THEN 0.80
  WHEN 'curious' THEN 0.70
  WHEN 'social' THEN 0.75
  WHEN 'solo' THEN 0.40
  WHEN 'open' THEN 0.65
  ELSE 0.60
END,
vibe_l = CASE vibe_tag
  WHEN 'chill' THEN 0.70
  WHEN 'hype' THEN 0.80
  WHEN 'romantic' THEN 0.80
  WHEN 'weird' THEN 0.60  
  WHEN 'down' THEN 0.50
  WHEN 'flowing' THEN 0.70
  WHEN 'curious' THEN 0.75
  WHEN 'social' THEN 0.85
  WHEN 'solo' THEN 0.60
  WHEN 'open' THEN 0.80
  ELSE 0.70
END
WHERE vibe_h IS NULL;

-- Update vibes_now with default HSL values  
UPDATE public.vibes_now
SET vibe_h = CASE vibe
  WHEN 'chill' THEN 200.0
  WHEN 'hype' THEN 60.0
  WHEN 'romantic' THEN 330.0
  WHEN 'weird' THEN 280.0
  WHEN 'down' THEN 240.0
  WHEN 'flowing' THEN 180.0
  WHEN 'curious' THEN 120.0
  WHEN 'social' THEN 30.0
  WHEN 'solo' THEN 270.0
  WHEN 'open' THEN 150.0
  ELSE 200.0
END,
vibe_s = CASE vibe
  WHEN 'chill' THEN 0.60
  WHEN 'hype' THEN 0.80
  WHEN 'romantic' THEN 0.70
  WHEN 'weird' THEN 0.90
  WHEN 'down' THEN 0.50
  WHEN 'flowing' THEN 0.80
  WHEN 'curious' THEN 0.70
  WHEN 'social' THEN 0.75
  WHEN 'solo' THEN 0.40
  WHEN 'open' THEN 0.65
  ELSE 0.60
END,
vibe_l = CASE vibe
  WHEN 'chill' THEN 0.70
  WHEN 'hype' THEN 0.80
  WHEN 'romantic' THEN 0.80
  WHEN 'weird' THEN 0.60
  WHEN 'down' THEN 0.50
  WHEN 'flowing' THEN 0.70
  WHEN 'curious' THEN 0.75
  WHEN 'social' THEN 0.85
  WHEN 'solo' THEN 0.60
  WHEN 'open' THEN 0.80
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