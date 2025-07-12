-- Phase 1B: Add performance indexes for boost analytics 
CREATE INDEX IF NOT EXISTS idx_floq_boosts_user_rate_limit 
  ON public.floq_boosts (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_floq_boosts_count_query 
  ON public.floq_boosts (floq_id, boost_type);

CREATE INDEX IF NOT EXISTS idx_floq_boosts_expires_cleanup 
  ON public.floq_boosts (expires_at);

-- Phase 3: Fresh Database Seed (Fixed conflict handling)

-- 1. Wake up any expired floqs
UPDATE floqs
SET    starts_at = now() - interval '30 minutes',
       ends_at   = now()  + interval '4 hours'
WHERE  ends_at < now();

-- 2. Add venue presence data (without conflict handling since there's no unique constraint)
INSERT INTO venue_live_presence (user_id, venue_id, vibe, last_heartbeat, expires_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM venues LIMIT 1),
  (ARRAY['social','hype','chill','flowing','romantic'])
    [floor(random()*5)+1]::vibe_enum,
  now(),
  now() + interval '2 minutes'
FROM generate_series(1,5);

-- 3. Seed vibes_now for presence visibility
INSERT INTO vibes_now (user_id, vibe, location, venue_id, visibility, updated_at, expires_at)
SELECT
  gen_random_uuid(),
  (ARRAY['social','hype','chill','flowing','romantic'])
    [floor(random()*5)+1]::vibe_enum,
  ST_SetSRID(
    ST_MakePoint(
      -118.261 + (random() - 0.5)*0.015,
      34.078  + (random() - 0.5)*0.015
    ), 4326),
  (SELECT id FROM venues LIMIT 1),
  'public',
  now(),
  now() + interval '2 minutes'
FROM generate_series(1,8)
ON CONFLICT (user_id) DO UPDATE SET
  vibe = EXCLUDED.vibe,
  location = EXCLUDED.location,
  updated_at = EXCLUDED.updated_at,
  expires_at = EXCLUDED.expires_at;