-- Demo Data Seeding Script for Clustering (USING EXISTING PROFILES)
-- This creates demo presence data using existing profile IDs

/* ================================================================
   STEP 2: SEED DEMO PRESENCE DATA (Using existing profiles)
================================================================ */

-- Create demo presence data using existing profile IDs
WITH existing_profiles AS (
  SELECT id FROM public.profiles LIMIT 10
),
demo_presence AS (
  SELECT 
    p.id as profile_id,
    -- Santa Monica area coordinates with spread
    34.0195 + (random() - 0.5) * 0.02 as lat,
    -118.4912 + (random() - 0.5) * 0.02 as lng,
    -- Random vibes
    (ARRAY['hype', 'chill', 'social', 'open', 'solo', 'curious', 'romantic', 'flowing', 'energetic', 'focused'])[
      floor(random() * 10 + 1)::int
    ] as vibe_text,
    -- Recent timestamps 
    now() - (random() * interval '10 minutes') as updated_time,
    -- Add sequence for multiple records per user
    s.seq
  FROM existing_profiles p
  CROSS JOIN (SELECT generate_series(1, 5) as seq) s -- 5 records per profile = 50 total
),
demo_with_geom AS (
  SELECT 
    profile_id,
    vibe_text,
    updated_time,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) as geom_point
  FROM demo_presence
)
INSERT INTO public.vibes_now (
  profile_id, 
  location,
  vibe, 
  updated_at, 
  expires_at,
  visibility
) 
SELECT 
  profile_id,
  geom_point,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '15 minutes',
  'public'
FROM demo_with_geom;

-- Add some concentrated areas for better clustering demo
WITH concentrated_demo AS (
  SELECT 
    (SELECT id FROM public.profiles LIMIT 1 OFFSET floor(random() * (SELECT COUNT(*) FROM public.profiles))::int) as profile_id,
    -- Venice Beach tight cluster
    34.0052 + (random() - 0.5) * 0.002 as lat,
    -118.4958 + (random() - 0.5) * 0.002 as lng,
    'hype'::vibe_enum as vibe_text,
    now() - (random() * interval '5 minutes') as updated_time
  FROM generate_series(1, 8)
  UNION ALL
  SELECT 
    (SELECT id FROM public.profiles LIMIT 1 OFFSET floor(random() * (SELECT COUNT(*) FROM public.profiles))::int) as profile_id,
    -- Santa Monica Pier cluster
    34.0089 + (random() - 0.5) * 0.002 as lat,
    -118.4980 + (random() - 0.5) * 0.002 as lng,
    'social'::vibe_enum as vibe_text,
    now() - (random() * interval '3 minutes') as updated_time
  FROM generate_series(1, 10)
),
concentrated_with_geom AS (
  SELECT 
    profile_id,
    vibe_text,
    updated_time,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) as geom_point
  FROM concentrated_demo
)
INSERT INTO public.vibes_now (
  profile_id, 
  location,
  vibe, 
  updated_at, 
  expires_at,
  visibility
) 
SELECT 
  profile_id,
  geom_point,
  vibe_text,
  updated_time,
  updated_time + interval '20 minutes',
  'public'
FROM concentrated_with_geom;

-- Force immediate refresh of field_tiles and clusters
SELECT public.refresh_field_tiles();
SELECT public.refresh_vibe_cluster_momentum();

-- Verification
DO $$
DECLARE
    presence_count INTEGER;
    field_tiles_count INTEGER;
    cluster_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO presence_count FROM public.vibes_now WHERE expires_at > now();
    SELECT COUNT(*) INTO field_tiles_count FROM public.field_tiles WHERE updated_at > now() - interval '2 minutes';
    SELECT COUNT(*) INTO cluster_count FROM public.vibe_cluster_momentum;
    
    RAISE NOTICE 'Demo clustering data created:';
    RAISE NOTICE '✓ Live presence records: %', presence_count;
    RAISE NOTICE '✓ Field tiles generated: %', field_tiles_count; 
    RAISE NOTICE '✓ Clusters available: %', cluster_count;
    
    IF cluster_count > 0 THEN
        RAISE NOTICE '🎉 Clustering system should now be visible on the field map!';
    END IF;
END $$;