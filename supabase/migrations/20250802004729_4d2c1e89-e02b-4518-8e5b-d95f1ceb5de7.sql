-- Demo Data Seeding Script for Clustering (FINAL)
-- This creates demo presence data in vibes_now table using only insertable columns

/* ================================================================
   STEP 2: SEED DEMO PRESENCE DATA (Fixed for generated columns)
================================================================ */

-- Generate 25 demo users with presence around Santa Monica area
WITH demo_users AS (
  SELECT
    gen_random_uuid() as profile_id,
    -- Santa Monica coordinates with realistic spread
    34.0195 + (random() - 0.5) * 0.02 as lat,
    -118.4912 + (random() - 0.5) * 0.02 as lng,
    -- Random vibes from your vibe enum
    (ARRAY['hype', 'chill', 'social', 'open', 'solo', 'curious', 'romantic', 'flowing', 'energetic', 'focused'])[
      floor(random() * 10 + 1)::int
    ] as vibe_text,
    -- Recent timestamps (within last 10 minutes)
    now() - (random() * interval '10 minutes') as updated_time
  FROM generate_series(1, 25)
),
demo_with_geom AS (
  SELECT 
    profile_id,
    lat,
    lng,
    vibe_text,
    updated_time,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) as geom_point
  FROM demo_users
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
  updated_time + interval '15 minutes', -- Expires in 15 minutes
  'public'
FROM demo_with_geom;

-- Add concentrated cluster 1: Venice Beach area (high energy vibes)
WITH venice_cluster AS (
  SELECT
    gen_random_uuid() as profile_id,
    34.0052 + (random() - 0.5) * 0.005 as lat, -- Tighter cluster
    -118.4958 + (random() - 0.5) * 0.005 as lng,
    (ARRAY['hype', 'energetic', 'social'])[
      floor(random() * 3 + 1)::int
    ] as vibe_text,
    now() - (random() * interval '5 minutes') as updated_time
  FROM generate_series(1, 12)
),
venice_with_geom AS (
  SELECT 
    profile_id,
    lat,
    lng,
    vibe_text,
    updated_time,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) as geom_point
  FROM venice_cluster
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
  updated_time + interval '20 minutes',
  'public'
FROM venice_with_geom;

-- Add concentrated cluster 2: Santa Monica Pier area (mixed social vibes)
WITH pier_cluster AS (
  SELECT
    gen_random_uuid() as profile_id,
    34.0089 + (random() - 0.5) * 0.003 as lat,
    -118.4980 + (random() - 0.5) * 0.003 as lng,
    (ARRAY['social', 'chill', 'flowing', 'curious', 'romantic'])[
      floor(random() * 5 + 1)::int
    ] as vibe_text,
    now() - (random() * interval '8 minutes') as updated_time
  FROM generate_series(1, 15)
),
pier_with_geom AS (
  SELECT 
    profile_id,
    lat,
    lng,
    vibe_text,
    updated_time,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) as geom_point
  FROM pier_cluster
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
  updated_time + interval '25 minutes',
  'public'
FROM pier_with_geom;

-- Force immediate refresh of field_tiles (normally done by cron every 5s)
SELECT public.refresh_field_tiles();

-- Force refresh of the materialized view  
SELECT public.refresh_vibe_cluster_momentum();

-- Verify the data was created successfully
DO $$
DECLARE
    presence_count INTEGER;
    field_tiles_count INTEGER;
    cluster_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO presence_count FROM public.vibes_now WHERE expires_at > now();
    SELECT COUNT(*) INTO field_tiles_count FROM public.field_tiles WHERE updated_at > now() - interval '1 minute';
    SELECT COUNT(*) INTO cluster_count FROM public.vibe_cluster_momentum;
    
    RAISE NOTICE 'Demo data created successfully:';
    RAISE NOTICE '- Presence records: %', presence_count;
    RAISE NOTICE '- Field tiles: %', field_tiles_count;
    RAISE NOTICE '- Clusters: %', cluster_count;
END $$;