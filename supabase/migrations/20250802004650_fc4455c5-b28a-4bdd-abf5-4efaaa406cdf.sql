-- Demo Data Seeding Script for Clustering (CORRECTED)
-- This creates demo presence data in vibes_now table using correct column structure
-- The existing refresh_field_tiles() cron job will automatically populate field_tiles

/* ================================================================
   STEP 2: SEED DEMO PRESENCE DATA (Fixed for actual table structure)
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
  visibility,
  gh5,
  vibe_h,
  vibe_s, 
  vibe_l
) 
SELECT 
  profile_id,
  geom_point,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '15 minutes', -- Expires in 15 minutes
  'public',
  -- Generate geohash for clustering
  ST_GeoHash(geom_point, 5),
  -- Default vibe HSL values based on vibe type
  CASE vibe_text
    WHEN 'hype' THEN 340
    WHEN 'chill' THEN 195
    WHEN 'social' THEN 35
    WHEN 'open' THEN 125
    WHEN 'solo' THEN 260
    WHEN 'curious' THEN 55
    WHEN 'romantic' THEN 320
    WHEN 'flowing' THEN 180
    WHEN 'energetic' THEN 45
    WHEN 'focused' THEN 160
    ELSE 195
  END::real,
  -- Saturation (70-90%)
  (70 + random() * 20)::real,
  -- Lightness (50-65%)
  (50 + random() * 15)::real
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
  visibility,
  gh5,
  vibe_h,
  vibe_s, 
  vibe_l
) 
SELECT 
  profile_id,
  geom_point,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '20 minutes',
  'public',
  ST_GeoHash(geom_point, 5),
  CASE vibe_text
    WHEN 'hype' THEN 340
    WHEN 'energetic' THEN 45
    WHEN 'social' THEN 35
    ELSE 340
  END::real,
  (80 + random() * 10)::real, -- High saturation for energy
  (55 + random() * 10)::real
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
  visibility,
  gh5,
  vibe_h,
  vibe_s, 
  vibe_l
) 
SELECT 
  profile_id,
  geom_point,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '25 minutes',
  'public',
  ST_GeoHash(geom_point, 5),
  CASE vibe_text
    WHEN 'social' THEN 35
    WHEN 'chill' THEN 195
    WHEN 'flowing' THEN 180
    WHEN 'curious' THEN 55
    WHEN 'romantic' THEN 320
    ELSE 195
  END::real,
  (70 + random() * 15)::real,
  (50 + random() * 15)::real
FROM pier_with_geom;

-- Force immediate refresh of field_tiles (normally done by cron every 5s)
SELECT public.refresh_field_tiles();

-- Force refresh of the materialized view  
SELECT public.refresh_vibe_cluster_momentum();