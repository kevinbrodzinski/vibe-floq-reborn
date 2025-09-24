
-- Add sample vibe clusters for demonstration in major cities
-- This ensures users see something even when there's no real-time data

INSERT INTO public.vibe_clusters (gh6, centroid, total, vibe_counts, vibe_popularity, vibe_momentum)
VALUES 
  -- Los Angeles area clusters
  ('9q5ctj', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), 12, 
   '{"social": 5, "hype": 3, "chill": 4}'::jsonb, 8.5, 2.1),
  
  ('9q5cth', ST_SetSRID(ST_MakePoint(-118.2615, 34.0736), 4326), 8,
   '{"romantic": 3, "chill": 5}'::jsonb, 6.2, 1.8),
   
  ('9q5ctu', ST_SetSRID(ST_MakePoint(-118.2398, 34.0407), 4326), 15,
   '{"hype": 8, "social": 4, "flowing": 3}'::jsonb, 11.3, 3.2),
   
  -- Venice Beach area
  ('9q5ct5', ST_SetSRID(ST_MakePoint(-118.4694, 33.9850), 4326), 20,
   '{"chill": 12, "social": 5, "curious": 3}'::jsonb, 15.7, 4.1),
   
  -- Santa Monica
  ('9q5ct7', ST_SetSRID(ST_MakePoint(-118.4912, 34.0195), 4326), 18,
   '{"social": 10, "romantic": 4, "flowing": 4}'::jsonb, 14.2, 3.8),
   
  -- Beverly Hills
  ('9q5csk', ST_SetSRID(ST_MakePoint(-118.4004, 34.0736), 4326), 9,
   '{"romantic": 6, "chill": 3}'::jsonb, 7.1, 1.5),
   
  -- New York area clusters (for users testing there)
  ('dr5reg', ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326), 25,
   '{"hype": 15, "social": 8, "flowing": 2}'::jsonb, 19.8, 5.2),
   
  ('dr5r7z', ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), 13,
   '{"social": 7, "curious": 4, "chill": 2}'::jsonb, 10.1, 2.9),
   
  -- San Francisco
  ('9q8yyk', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 16,
   '{"curious": 9, "social": 4, "flowing": 3}'::jsonb, 12.4, 3.3),
   
  -- London (for international users)
  ('gcpvj0', ST_SetSRID(ST_MakePoint(-0.1276, 51.5074), 4326), 11,
   '{"chill": 6, "social": 3, "romantic": 2}'::jsonb, 8.7, 2.0)

ON CONFLICT (gh6) DO UPDATE SET
  total = EXCLUDED.total,
  vibe_counts = EXCLUDED.vibe_counts,
  vibe_popularity = EXCLUDED.vibe_popularity,
  vibe_momentum = EXCLUDED.vibe_momentum;

-- Refresh the materialized view to include new data
REFRESH MATERIALIZED VIEW CONCURRENTLY public.vibe_cluster_momentum;
