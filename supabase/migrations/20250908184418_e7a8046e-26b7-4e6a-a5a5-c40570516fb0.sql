-- Phase 1 Fix: Database alignment for vibes_now table with proper enum handling
-- Add computed valence/energy from vibe enum and optimize for field queries

-- Add function to compute valence/energy from vibe (fixed for vibe_enum)
CREATE OR REPLACE FUNCTION compute_vibe_vector(vibe_input vibe_enum)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Map vibes to emotional coordinates
  RETURN CASE vibe_input
    WHEN 'chill' THEN '{"valence": 0.2, "energy": 0.3}'::jsonb
    WHEN 'hype' THEN '{"valence": 0.8, "energy": 0.9}'::jsonb
    WHEN 'curious' THEN '{"valence": 0.5, "energy": 0.6}'::jsonb
    WHEN 'social' THEN '{"valence": 0.7, "energy": 0.7}'::jsonb
    WHEN 'solo' THEN '{"valence": 0.0, "energy": 0.4}'::jsonb
    WHEN 'romantic' THEN '{"valence": 0.6, "energy": 0.5}'::jsonb
    WHEN 'weird' THEN '{"valence": 0.3, "energy": 0.8}'::jsonb
    WHEN 'down' THEN '{"valence": -0.6, "energy": 0.2}'::jsonb
    WHEN 'flowing' THEN '{"valence": 0.4, "energy": 0.6}'::jsonb
    WHEN 'open' THEN '{"valence": 0.5, "energy": 0.5}'::jsonb
    WHEN 'energetic' THEN '{"valence": 0.6, "energy": 0.9}'::jsonb
    WHEN 'excited' THEN '{"valence": 0.8, "energy": 0.8}'::jsonb
    WHEN 'focused' THEN '{"valence": 0.3, "energy": 0.7}'::jsonb
    ELSE '{"valence": 0.0, "energy": 0.5}'::jsonb
  END;
END;
$$;

-- Update vibes_now table with computed columns (fixed enum reference)
ALTER TABLE vibes_now 
ADD COLUMN IF NOT EXISTS vibe_vector jsonb GENERATED ALWAYS AS (compute_vibe_vector(vibe)) STORED;

-- Check if h3_idx column already exists, if not create computation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vibes_now' AND column_name = 'h3_idx_7') THEN
    -- Add H3 index computation function
    CREATE OR REPLACE FUNCTION compute_h3_index(lat double precision, lng double precision, resolution integer DEFAULT 7)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    AS $func$
      -- Grid-based pseudo-H3 IDs for field tiling
      SELECT CONCAT(
        LPAD(FLOOR((lat + 90) * POWER(10, resolution / 2))::text, 6, '0'),
        LPAD(FLOOR((lng + 180) * POWER(10, resolution / 2))::text, 6, '0')
      );
    $func$;
    
    ALTER TABLE vibes_now 
    ADD COLUMN h3_idx_7 text GENERATED ALWAYS AS (
      compute_h3_index(ST_Y(location::geometry), ST_X(location::geometry), 7)
    ) STORED;
  END IF;
END
$$;

-- Create optimized indexes for field queries
CREATE INDEX IF NOT EXISTS idx_vibes_now_h3_7 ON vibes_now(h3_idx_7);
CREATE INDEX IF NOT EXISTS idx_vibes_now_field_composite ON vibes_now(h3_idx_7, updated_at DESC, visibility) 
WHERE expires_at > now();

-- Function to get field tiles from vibes_now data with proper k-anon
CREATE OR REPLACE FUNCTION get_field_tiles_from_vibes(
  h3_cells text[],
  time_window_minutes integer DEFAULT 10,
  min_crowd_count integer DEFAULT 3,
  audience text DEFAULT 'public'
)
RETURNS TABLE(
  tile_id text,
  crowd_count integer,
  avg_vibe jsonb,
  active_floq_ids uuid[],
  updated_at timestamptz,
  center_lat double precision,
  center_lng double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vn.h3_idx_7 as tile_id,
    COUNT(*)::integer as crowd_count,
    jsonb_build_object(
      'h', COALESCE(AVG((vn.vibe_vector->>'valence')::numeric) * 180 + 180, 180),
      's', COALESCE(AVG((vn.vibe_vector->>'energy')::numeric) * 100, 50),
      'l', GREATEST(20, LEAST(80, COALESCE(AVG((vn.vibe_vector->>'energy')::numeric) * 60 + 40, 50)))
    ) as avg_vibe,
    CASE 
      WHEN audience = 'close' AND COUNT(*) >= min_crowd_count 
      THEN ARRAY_AGG(DISTINCT venue_id) FILTER (WHERE venue_id IS NOT NULL)
      ELSE ARRAY[]::uuid[]
    END as active_floq_ids,
    MAX(vn.updated_at) as updated_at,
    AVG(ST_Y(vn.location::geometry)) as center_lat,
    AVG(ST_X(vn.location::geometry)) as center_lng
  FROM vibes_now vn
  WHERE vn.h3_idx_7 = ANY(h3_cells)
    AND vn.expires_at > now()
    AND vn.updated_at > now() - (time_window_minutes || ' minutes')::interval
    AND vn.visibility = 'public'
  GROUP BY vn.h3_idx_7
  HAVING COUNT(*) >= min_crowd_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_field_tiles_from_vibes TO authenticated;