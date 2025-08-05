-- Demo Data Seeding Script for Clustering
-- This creates demo presence data in vibes_now table
-- The existing refresh_field_tiles() cron job will automatically populate field_tiles
-- and the clustering system will display the data

/* ================================================================
   STEP 2: SEED DEMO PRESENCE DATA
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
)
INSERT INTO public.vibes_now (
  profile_id, 
  lat, 
  lng, 
  vibe, 
  updated_at, 
  expires_at,
  visibility,
  is_live
) 
SELECT 
  profile_id,
  lat,
  lng,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '15 minutes', -- Expires in 15 minutes
  'public'::visibility_enum,
  true
FROM demo_users;

-- Add some concentrated clusters for better demo visualization
-- Cluster 1: Venice Beach area (high energy vibes)
WITH venice_cluster AS (
  SELECT
    gen_random_uuid() as profile_id,
    34.0052 + (random() - 0.5) * 0.005 as lat, -- Tighter cluster
    -118.4958 + (random() - 0.5) * 0.005 as lng,
    (ARRAY['hype', 'energetic', 'social', 'excited'])[
      floor(random() * 4 + 1)::int
    ] as vibe_text,
    now() - (random() * interval '5 minutes') as updated_time
  FROM generate_series(1, 12)
)
INSERT INTO public.vibes_now (
  profile_id, 
  lat, 
  lng, 
  vibe, 
  updated_at, 
  expires_at,
  visibility,
  is_live
) 
SELECT 
  profile_id,
  lat,
  lng,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '20 minutes',
  'public'::visibility_enum,
  true
FROM venice_cluster;

-- Cluster 2: Santa Monica Pier area (mixed social vibes)
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
)
INSERT INTO public.vibes_now (
  profile_id, 
  lat, 
  lng, 
  vibe, 
  updated_at, 
  expires_at,
  visibility,
  is_live
) 
SELECT 
  profile_id,
  lat,
  lng,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '25 minutes',
  'public'::visibility_enum,
  true
FROM pier_cluster;

-- Cluster 3: Third Street Promenade (focused/work vibes)
WITH promenade_cluster AS (
  SELECT
    gen_random_uuid() as profile_id,
    34.0161 + (random() - 0.5) * 0.004 as lat,
    -118.4958 + (random() - 0.5) * 0.004 as lng,
    (ARRAY['focused', 'solo', 'chill', 'open'])[
      floor(random() * 4 + 1)::int
    ] as vibe_text,
    now() - (random() * interval '3 minutes') as updated_time
  FROM generate_series(1, 8)
)
INSERT INTO public.vibes_now (
  profile_id, 
  lat, 
  lng, 
  vibe, 
  updated_at, 
  expires_at,
  visibility,
  is_live
) 
SELECT 
  profile_id,
  lat,
  lng,
  vibe_text::vibe_enum,
  updated_time,
  updated_time + interval '30 minutes',
  'public'::visibility_enum,
  true
FROM promenade_cluster;

-- Force immediate refresh of field_tiles (normally done by cron every 5s)
SELECT public.refresh_field_tiles();

-- Force refresh of the materialized view
SELECT public.refresh_vibe_cluster_momentum();

/* ================================================================
   VERIFICATION QUERIES (uncomment to check results)
================================================================ */

-- Check demo data was inserted
-- SELECT COUNT(*) as demo_presence_count FROM public.vibes_now WHERE expires_at > now();

-- Check field tiles were generated  
-- SELECT COUNT(*) as field_tiles_count FROM public.field_tiles WHERE updated_at > now() - interval '1 minute';

-- Check clusters are available
-- SELECT COUNT(*) as cluster_count FROM public.vibe_cluster_momentum;