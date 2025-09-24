-- Strategic Fix: Seed demo data with extended TTL and proper location
-- This addresses the "no people on field screen" issue

-- 0️⃣ Create eight demo profiles and capture their UUIDs
WITH demo_profiles AS (
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  SELECT 
    gen_random_uuid(),
    'demo_user_' || gs,
    'Demo User '  || gs,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || gs
  FROM generate_series(1,8) AS gs
  ON CONFLICT (username) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url
  RETURNING id, username
)
SELECT * INTO TEMP TABLE tmp_demo_ids FROM demo_profiles;

-- 1️⃣ Wipe any previous seed for those demo users
DELETE FROM public.vibes_now v
WHERE EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = v.user_id 
  AND p.username LIKE 'demo_user_%'
);

DELETE FROM public.vibes_log v
WHERE EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = v.user_id 
  AND p.username LIKE 'demo_user_%'
);

-- 2️⃣ Insert fresh presence within 2 km of Venice Beach
WITH seeded AS (
  SELECT
    id                                    AS user_id,
    (ARRAY['social','chill','hype','flowing','romantic'])[ceil(random()*5)]::vibe_enum AS vibe,
    ST_SetSRID(
      ST_MakePoint(
        -118.469 + (random()-0.5)*0.02,   -- ±0.01° ≈ ±1 km
         33.985 + (random()-0.5)*0.02
      ), 4326)                           AS location
  FROM tmp_demo_ids
)
INSERT INTO public.vibes_now
      (user_id,  vibe, location, visibility, expires_at, updated_at,
       broadcast_radius, geohash6)
SELECT  user_id,  vibe, location, 'public',
        now() + interval '4 hours',
        now(),
        500,
        left(st_geohash(location, 6), 6)
FROM seeded
ON CONFLICT (user_id) DO UPDATE
  SET vibe            = EXCLUDED.vibe,
      location        = EXCLUDED.location,
      expires_at      = EXCLUDED.expires_at,
      updated_at      = EXCLUDED.updated_at,
      geohash6        = EXCLUDED.geohash6;

-- 3️⃣ Optional historical log
INSERT INTO public.vibes_log (user_id, vibe, location, ts)
SELECT user_id, vibe, location, now()
FROM (
  SELECT
    id                                    AS user_id,
    (ARRAY['social','chill','hype','flowing','romantic'])[ceil(random()*5)]::vibe_enum AS vibe,
    ST_SetSRID(
      ST_MakePoint(
        -118.469 + (random()-0.5)*0.02,
         33.985 + (random()-0.5)*0.02
      ), 4326)                           AS location
  FROM tmp_demo_ids
) seeded;

-- 4️⃣ Ensure demo policy exists for unauthenticated access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vibes_now' 
    AND policyname = 'demo_vibes_public_read'
  ) THEN
    CREATE POLICY demo_vibes_public_read ON public.vibes_now
      FOR SELECT USING (true);
  END IF;
END $$;