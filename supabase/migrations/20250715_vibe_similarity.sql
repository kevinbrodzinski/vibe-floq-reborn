-- Enhanced vibe similarity system for Phase 3-A compatibility glow
-- Creates optimized lookup table and RPC for finding compatible nearby clusters

-- 1. Create vibe similarity lookup table (single row per unordered pair)
CREATE TABLE IF NOT EXISTS public.vibe_similarity (
  vibe_low  vibe_enum NOT NULL,
  vibe_high vibe_enum NOT NULL,
  score     real      NOT NULL CHECK (score BETWEEN 0 AND 1),
  PRIMARY KEY (vibe_low, vibe_high)
);

-- Helper to force (low, high) ordering for canonical pairs
CREATE OR REPLACE FUNCTION public.norm_pair(a vibe_enum, b vibe_enum)
RETURNS TABLE (low vibe_enum, high vibe_enum)
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$
  SELECT LEAST(a,b), GREATEST(a,b);
$$;

-- Insert compatibility matrix (upper triangle only - canonical pairs)
INSERT INTO public.vibe_similarity (vibe_low, vibe_high, score) VALUES
  -- Self-matches (identical vibes)
  ('chill', 'chill', 1.0),
  ('down', 'down', 1.0),
  ('flowing', 'flowing', 1.0),
  ('hype', 'hype', 1.0),
  ('open', 'open', 1.0),
  ('romantic', 'romantic', 1.0),
  ('social', 'social', 1.0),
  ('solo', 'solo', 1.0),
  ('weird', 'weird', 1.0),
  
  -- High compatibility pairs (0.7-0.8)
  ('chill', 'down', 0.8),
  ('chill', 'solo', 0.7),
  ('flowing', 'social', 0.8),
  ('open', 'romantic', 0.7),
  ('hype', 'social', 0.7),
  ('open', 'weird', 0.8),
  
  -- Medium compatibility pairs (0.5-0.6)
  ('chill', 'flowing', 0.5),
  ('flowing', 'romantic', 0.6),
  ('hype', 'open', 0.5),
  ('down', 'solo', 0.6),
  ('hype', 'weird', 0.5),
  
  -- Lower compatibility pairs (0.3-0.4)
  ('chill', 'romantic', 0.3),
  ('open', 'social', 0.4),
  ('down', 'flowing', 0.3),
  
  -- Weak connections (0.2)
  ('social', 'solo', 0.2),
  ('chill', 'hype', 0.2),
  ('down', 'weird', 0.2)
ON CONFLICT (vibe_low, vibe_high) DO UPDATE SET score = EXCLUDED.score;

-- 2. Symmetric lookup function with auto-flip
CREATE OR REPLACE FUNCTION public.vibe_similarity(a vibe_enum, b vibe_enum)
RETURNS real
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$
  SELECT COALESCE(
           (SELECT score FROM public.vibe_similarity
            WHERE (vibe_low,vibe_high) = (LEAST(a,b), GREATEST(a,b))),
           0  -- default when not found
         );
$$;

-- 3. Add performance index on vibe_clusters if not present
CREATE INDEX IF NOT EXISTS vibe_clusters_gix
  ON public.vibe_clusters
  USING GIST (centroid);

-- 4. Enhance vibe_clusters with generated columns for performance
-- Note: This assumes vibe_clusters is a materialized view. If it's a regular view, 
-- you'll need to recreate it as a materialized view first.
DO $$
BEGIN
  -- Check if columns already exist before adding them
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'vibe_clusters' AND column_name = 'dom_vibe') THEN
    ALTER TABLE public.vibe_clusters
      ADD COLUMN dom_vibe vibe_enum;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'vibe_clusters' AND column_name = 'dom_count') THEN
    ALTER TABLE public.vibe_clusters
      ADD COLUMN dom_count int;
  END IF;
END $$;

-- 5. Create optimized get_compat_clusters RPC function
CREATE OR REPLACE FUNCTION public.get_compat_clusters(
  u_lat double precision,
  u_lng double precision,
  u_vibe vibe_enum,
  radius_m int DEFAULT 1000,
  limit_n int DEFAULT 3
)
RETURNS TABLE (
  gh6        text,
  centroid   geography,
  dom_vibe   vibe_enum,
  vibe_match real,
  distance_m real,
  user_count int
)
LANGUAGE sql SECURITY DEFINER PARALLEL SAFE AS
$$
  SELECT
    vc.gh6,
    vc.centroid,
    COALESCE(vc.dom_vibe, 
      (SELECT key::vibe_enum FROM jsonb_each(vc.vibe_counts) 
       ORDER BY value::int DESC LIMIT 1)) AS dom_vibe,
    vibe_similarity(u_vibe, 
      COALESCE(vc.dom_vibe, 
        (SELECT key::vibe_enum FROM jsonb_each(vc.vibe_counts) 
         ORDER BY value::int DESC LIMIT 1))) AS vibe_match,
    ST_DistanceSphere(vc.centroid, ST_MakePoint(u_lng, u_lat)) AS distance_m,
    COALESCE(vc.dom_count,
      (SELECT value::int FROM jsonb_each(vc.vibe_counts) 
       ORDER BY value::int DESC LIMIT 1)) AS user_count
  FROM public.vibe_clusters vc
  WHERE ST_DWithin(
          vc.centroid::geography,
          ST_MakePoint(u_lng, u_lat)::geography,
          radius_m
        )
    AND vibe_similarity(u_vibe, 
          COALESCE(vc.dom_vibe, 
            (SELECT key::vibe_enum FROM jsonb_each(vc.vibe_counts) 
             ORDER BY value::int DESC LIMIT 1))) > 0.2
  ORDER BY vibe_match DESC, distance_m ASC
  LIMIT limit_n;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_compat_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION public.vibe_similarity TO authenticated;
GRANT SELECT ON TABLE public.vibe_similarity TO authenticated;