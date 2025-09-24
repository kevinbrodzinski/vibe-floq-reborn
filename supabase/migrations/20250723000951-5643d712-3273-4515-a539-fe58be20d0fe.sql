
-- ------------------------------------------------------------
-- Seed ~200 synthetic "vibe clusters" (two metro areas)
-- ------------------------------------------------------------
-- San Francisco Bay Area  (H3 res 6 ≈ 1 km)
INSERT INTO public.vibe_clusters (gh6, centroid, total, vibe_counts)
SELECT
  ST_GeoHash(ST_MakePoint(lon, lat), 6) as gh6,
  ST_SetSRID(ST_MakePoint(lon, lat), 4326) as centroid,
  (random() * 50 + 10)::integer as total,
  jsonb_build_object(
      'chill',  (random() * 15)::integer,
      'hype',   (random() * 15)::integer,
      'focus',  (random() * 15)::integer,
      'explore',(random() * 15)::integer
  ) as vibe_counts
FROM generate_series(1,100) g,
     LATERAL (
       -- roughly around downtown SF
       SELECT
         -122.42 + random() * 0.10 as lon,
          37.77 + random() * 0.10 as lat
     ) p;

-- Los Angeles Basin
INSERT INTO public.vibe_clusters (gh6, centroid, total, vibe_counts)
SELECT
  ST_GeoHash(ST_MakePoint(lon, lat), 6) as gh6,
  ST_SetSRID(ST_MakePoint(lon, lat), 4326) as centroid,
  (random() * 50 + 10)::integer as total,
  jsonb_build_object(
      'chill',  (random() * 15)::integer,
      'hype',   (random() * 15)::integer,
      'focus',  (random() * 15)::integer,
      'explore',(random() * 15)::integer
  ) as vibe_counts
FROM generate_series(1,100) g,
     LATERAL (
       -- roughly around DTLA / Santa Monica
       SELECT
         -118.45 + random() * 0.30 as lon,
          34.00 + random() * 0.25 as lat
     ) p;
