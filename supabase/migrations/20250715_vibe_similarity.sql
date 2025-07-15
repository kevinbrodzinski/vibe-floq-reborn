-- Enhanced vibe similarity system for Phase 3-A compatibility glow
-- Creates optimized lookup table and RPC for finding compatible nearby clusters

-- 1. Create vibe similarity lookup table (single row per unordered pair)
CREATE TABLE IF NOT EXISTS public.vibe_similarity (
  vibe_low  vibe_enum NOT NULL,
  vibe_high vibe_enum NOT NULL,
  score     real      NOT NULL CHECK (score BETWEEN 0 AND 1),
  PRIMARY KEY (vibe_low, vibe_high)
);

-- Add comment for clarity
COMMENT ON TABLE public.vibe_similarity IS 'Compatibility scores between vibe pairs. Stores only canonical (low,high) pairs to avoid duplication.';
COMMENT ON COLUMN public.vibe_similarity.score IS 'Compatibility score from 0.0 (incompatible) to 1.0 (perfect match)';

-- Optimize autovacuum for this small frequently-read table
ALTER TABLE public.vibe_similarity SET (autovacuum_vacuum_scale_factor = 0.05);

-- Insert compatibility matrix using CTE to ensure canonical ordering
WITH vibe_pairs(a, b, score) AS (
  VALUES
    -- Self-matches (identical vibes = 1.0)
    ('chill'::vibe_enum, 'chill'::vibe_enum, 1.0),
    ('down'::vibe_enum, 'down'::vibe_enum, 1.0),
    ('flowing'::vibe_enum, 'flowing'::vibe_enum, 1.0),
    ('hype'::vibe_enum, 'hype'::vibe_enum, 1.0),
    ('open'::vibe_enum, 'open'::vibe_enum, 1.0),
    ('romantic'::vibe_enum, 'romantic'::vibe_enum, 1.0),
    ('social'::vibe_enum, 'social'::vibe_enum, 1.0),
    ('solo'::vibe_enum, 'solo'::vibe_enum, 1.0),
    ('weird'::vibe_enum, 'weird'::vibe_enum, 1.0),
    
    -- High compatibility pairs (0.7-0.8)
    ('chill'::vibe_enum, 'down'::vibe_enum, 0.8),
    ('chill'::vibe_enum, 'solo'::vibe_enum, 0.7),
    ('flowing'::vibe_enum, 'social'::vibe_enum, 0.8),
    ('open'::vibe_enum, 'romantic'::vibe_enum, 0.7),
    ('hype'::vibe_enum, 'social'::vibe_enum, 0.7),
    ('open'::vibe_enum, 'weird'::vibe_enum, 0.8),
    
    -- Medium compatibility pairs (0.5-0.6)
    ('chill'::vibe_enum, 'flowing'::vibe_enum, 0.5),
    ('flowing'::vibe_enum, 'romantic'::vibe_enum, 0.6),
    ('hype'::vibe_enum, 'open'::vibe_enum, 0.5),
    ('down'::vibe_enum, 'solo'::vibe_enum, 0.6),
    ('hype'::vibe_enum, 'weird'::vibe_enum, 0.5),
    
    -- Lower compatibility pairs (0.3-0.4)
    ('chill'::vibe_enum, 'romantic'::vibe_enum, 0.3),
    ('open'::vibe_enum, 'social'::vibe_enum, 0.4),
    ('down'::vibe_enum, 'flowing'::vibe_enum, 0.3),
    
    -- Weak connections (0.2)
    ('social'::vibe_enum, 'solo'::vibe_enum, 0.2),
    ('chill'::vibe_enum, 'hype'::vibe_enum, 0.2),
    ('down'::vibe_enum, 'weird'::vibe_enum, 0.2)
)
INSERT INTO public.vibe_similarity (vibe_low, vibe_high, score)
SELECT LEAST(a, b), GREATEST(a, b), score
FROM vibe_pairs
ON CONFLICT (vibe_low, vibe_high) DO UPDATE SET score = EXCLUDED.score;

-- 2. Symmetric lookup function with auto-flip and NULL safety
CREATE OR REPLACE FUNCTION public.vibe_similarity(a vibe_enum, b vibe_enum)
RETURNS real
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$
  SELECT COALESCE(
           (SELECT score FROM public.vibe_similarity
            WHERE (vibe_low, vibe_high) = (LEAST(a, b), GREATEST(a, b))),
           0.0  -- default when pair not found, ensures no NULL in comparisons
         );
$$;

COMMENT ON FUNCTION public.vibe_similarity IS 'Get compatibility score between any two vibes. Auto-handles ordering and returns 0.0 for missing pairs.';

-- 3. Add spatial performance index on vibe_clusters centroid
CREATE INDEX IF NOT EXISTS vibe_clusters_centroid_gix
  ON public.vibe_clusters
  USING GIST (centroid);

-- 4. Enhance vibe_clusters with precomputed dominant vibe for performance
-- This avoids JSON parsing on every RPC call
DO $$
BEGIN
  -- Check if dom_vibe column exists, add if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                   AND table_name = 'vibe_clusters' 
                   AND column_name = 'dom_vibe') THEN
    
    -- For materialized views, we add regular columns and update them manually
    -- Generated columns don't work with materialized views in all PG versions
    ALTER TABLE public.vibe_clusters ADD COLUMN dom_vibe vibe_enum;
    
    -- Populate existing data
    UPDATE public.vibe_clusters SET dom_vibe = (
      SELECT key::vibe_enum 
      FROM jsonb_each(vibe_counts) 
      ORDER BY value::int DESC 
      LIMIT 1
    );
  END IF;

  -- Check if dom_count column exists, add if missing  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                   AND table_name = 'vibe_clusters' 
                   AND column_name = 'dom_count') THEN
    
    ALTER TABLE public.vibe_clusters ADD COLUMN dom_count int;
    
    -- Populate existing data
    UPDATE public.vibe_clusters SET dom_count = (
      SELECT value::int 
      FROM jsonb_each(vibe_counts) 
      ORDER BY value::int DESC 
      LIMIT 1
    );
  END IF;
END $$;

-- 5. Create optimized get_compat_clusters RPC function
-- Uses precomputed dom_vibe for maximum performance
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
    -- Use precomputed dom_vibe for performance, fallback to JSON parsing if needed
    COALESCE(
      vc.dom_vibe, 
      (SELECT key::vibe_enum FROM jsonb_each(vc.vibe_counts) 
       ORDER BY value::int DESC LIMIT 1)
    ) AS dom_vibe,
    -- Calculate compatibility score
    vibe_similarity(
      u_vibe, 
      COALESCE(
        vc.dom_vibe,
        (SELECT key::vibe_enum FROM jsonb_each(vc.vibe_counts) 
         ORDER BY value::int DESC LIMIT 1)
      )
    ) AS vibe_match,
    -- Calculate distance using spherical distance for accuracy
    ST_DistanceSphere(vc.centroid, ST_MakePoint(u_lng, u_lat)) AS distance_m,
    -- Use precomputed user count
    COALESCE(
      vc.dom_count,
      (SELECT value::int FROM jsonb_each(vc.vibe_counts) 
       ORDER BY value::int DESC LIMIT 1)
    ) AS user_count
  FROM public.vibe_clusters vc
  WHERE ST_DWithin(
          vc.centroid::geography,
          ST_MakePoint(u_lng, u_lat)::geography,
          radius_m
        )
    -- Filter for meaningful compatibility (> 0.2)
    AND vibe_similarity(
          u_vibe, 
          COALESCE(
            vc.dom_vibe,
            (SELECT key::vibe_enum FROM jsonb_each(vc.vibe_counts) 
             ORDER BY value::int DESC LIMIT 1)
          )
        ) > 0.2
  ORDER BY vibe_match DESC, distance_m ASC
  LIMIT limit_n;
$$;

COMMENT ON FUNCTION public.get_compat_clusters IS 'Find nearby vibe clusters with compatibility > 0.2. Uses spatial index and precomputed dominant vibes for performance.';

-- 6. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_compat_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION public.vibe_similarity TO authenticated;
GRANT SELECT ON TABLE public.vibe_similarity TO authenticated;

-- Add RLS policy to make vibe_similarity read-only for regular users
ALTER TABLE public.vibe_similarity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vibe_similarity_read_only" ON public.vibe_similarity
  FOR SELECT TO authenticated
  USING (true);

-- Prevent direct modifications by regular users (only service_role can modify)
CREATE POLICY "vibe_similarity_no_modify" ON public.vibe_similarity
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);