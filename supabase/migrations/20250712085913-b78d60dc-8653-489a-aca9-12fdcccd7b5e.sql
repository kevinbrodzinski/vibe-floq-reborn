-- Phase 1: TEMP demo RLS (DROP BEFORE PROD!)
CREATE POLICY demo_vibes_public_read
  ON public.vibes_now
  FOR SELECT USING (true);

CREATE POLICY demo_floqs_public_read
  ON public.floqs
  FOR SELECT USING (true);

-- Phase 2: Demo seed (idempotent)
BEGIN;

-- 1. Bump expired public floqs
UPDATE public.floqs
SET    starts_at = now() - interval '30 minutes',
       ends_at   = now() + interval '4 hours'
WHERE  visibility = 'public'
  AND  ends_at < now();

-- 2. Upsert demo profiles (keyed by username -> deterministic)
INSERT INTO public.profiles (id, username, display_name, avatar_url)
SELECT
  uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, 'demo_user_' || gs)::uuid, -- stable UUID
  'demo_user_' || gs,
  'Demo User '  || gs,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' || gs
FROM generate_series(1,10) gs
ON CONFLICT (username)              -- <-- deterministic
DO UPDATE
  SET display_name = EXCLUDED.display_name;

-- 3. Upsert presence for 8 of them
WITH users AS (
  SELECT id AS user_id
  FROM public.profiles
  WHERE username LIKE 'demo_user_%'
  ORDER BY username
  LIMIT 8
)
INSERT INTO public.vibes_now (user_id, vibe, location, visibility, updated_at, expires_at)
SELECT
  user_id,
  (ARRAY['social','hype','chill','romantic','flowing'])[floor(random()*5)+1]::vibe_enum,
  ST_SetSRID(
    ST_MakePoint(
      -118.261 + (random()-0.5)*0.015,
       34.078 + (random()-0.5)*0.015
    ),4326),
  'public',
  now(),
  now() + interval '30 minutes'
FROM users
ON CONFLICT (user_id)
DO UPDATE
  SET
    vibe       = EXCLUDED.vibe,
    location   = EXCLUDED.location,
    updated_at = EXCLUDED.updated_at,
    expires_at = EXCLUDED.expires_at;

COMMIT;