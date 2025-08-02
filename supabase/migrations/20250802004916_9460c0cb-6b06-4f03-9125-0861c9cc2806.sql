-- Demo Data Seeding Script for Clustering (FINAL - RESPECTS UNIQUE CONSTRAINT)
-- This creates demo presence data using existing profiles with upsert logic

/* ================================================================
   STEP 2: SEED DEMO PRESENCE DATA (One record per profile)
================================================================ */

-- First, clear any existing demo data to avoid conflicts
DELETE FROM public.vibes_now WHERE expires_at > now() + interval '10 minutes';

-- Create demo presence data using existing profile IDs
WITH existing_profiles AS (
  SELECT id FROM public.profiles LIMIT 20
),
demo_data AS (
  SELECT 
    p.id as profile_id,
    -- Santa Monica area coordinates with realistic spread
    (34.0195 + (random() - 0.5) * 0.02) as lat,
    (-118.4912 + (random() - 0.5) * 0.02) as lng,
    -- Random vibes from enum
    (ARRAY['hype', 'chill', 'social', 'open', 'solo', 'curious', 'romantic', 'flowing', 'energetic', 'focused'])[
      floor(random() * 10 + 1)::int
    ] as vibe_text,
    -- Recent timestamps 
    now() - (random() * interval '10 minutes') as updated_time
  FROM existing_profiles p
),
demo_with_geom AS (
  SELECT 
    profile_id,
    vibe_text,
    updated_time,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326) as geom_point
  FROM demo_data
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
FROM demo_with_geom
ON CONFLICT (profile_id) DO UPDATE SET
  location = EXCLUDED.location,
  vibe = EXCLUDED.vibe,
  updated_at = EXCLUDED.updated_at,
  expires_at = EXCLUDED.expires_at,
  visibility = EXCLUDED.visibility;

-- Force immediate refresh of field_tiles and clusters
SELECT public.refresh_field_tiles();
SELECT public.refresh_vibe_cluster_momentum();

-- Verification and success message
DO $$
DECLARE
    presence_count INTEGER;
    field_tiles_count INTEGER;
    cluster_count INTEGER;
    sample_cluster RECORD;
BEGIN
    SELECT COUNT(*) INTO presence_count FROM public.vibes_now WHERE expires_at > now();
    SELECT COUNT(*) INTO field_tiles_count FROM public.field_tiles WHERE updated_at > now() - interval '2 minutes';
    SELECT COUNT(*) INTO cluster_count FROM public.vibe_cluster_momentum;
    
    RAISE NOTICE '🎉 DEMO CLUSTERING DATA SUCCESSFULLY CREATED! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '  ✓ Live presence records: %', presence_count;
    RAISE NOTICE '  ✓ Field tiles generated: %', field_tiles_count; 
    RAISE NOTICE '  ✓ Clusters available: %', cluster_count;
    RAISE NOTICE '';
    
    IF cluster_count > 0 THEN
        -- Get a sample cluster for verification
        SELECT gh6, total_now, vibe_mode INTO sample_cluster 
        FROM public.vibe_cluster_momentum 
        ORDER BY total_now DESC 
        LIMIT 1;
        
        RAISE NOTICE '🗺️  Biggest cluster: % people in % mode at tile %', 
                     sample_cluster.total_now, sample_cluster.vibe_mode, sample_cluster.gh6;
        RAISE NOTICE '';
        RAISE NOTICE '🎯 NEXT STEPS:';
        RAISE NOTICE '  1. Go to your Field Map (/field)';
        RAISE NOTICE '  2. The VibeDensityMap should now show clusters!';
        RAISE NOTICE '  3. Clusters will auto-refresh every 5 seconds';
        RAISE NOTICE '';
        RAISE NOTICE '💡 The clustering system is now LIVE and working!';
    ELSE
        RAISE NOTICE '⚠️  No clusters generated. Check if refresh_field_tiles() is working.';
    END IF;
END $$;