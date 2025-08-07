-- Fix get_compat_clusters RPC function to work with current vibe_clusters schema
-- This function was missing dom_vibe and dom_count columns which are needed by the compat_clusters edge function

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_compat_clusters(double precision, double precision, text);

-- Create the fixed function that extracts dom_vibe and dom_count from vibe_counts JSONB
CREATE OR REPLACE FUNCTION public.get_compat_clusters(
  u_lat double precision,
  u_lng double precision, 
  u_vibe text
) RETURNS TABLE (
  gh6 text,
  centroid jsonb,
  dom_vibe text,
  vibe_match double precision,
  distance_m double precision,
  user_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_point AS (
    SELECT ST_SetSRID(ST_MakePoint(u_lng, u_lat), 4326) as geom
  ),
  nearby_clusters AS (
    SELECT 
      vc.gh6,
      vc.centroid,
      vc.vibe_counts,
      vc.total_users,
      ST_Distance(
        ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(vc.centroid), 4326), 3857),
        ST_Transform(up.geom, 3857)
      ) as distance_m
    FROM public.vibe_clusters vc, user_point up
    WHERE ST_DWithin(
      ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(vc.centroid), 4326), 3857),
      ST_Transform(up.geom, 3857),
      1000  -- 1km radius
    )
  ),
  cluster_analysis AS (
    SELECT 
      nc.gh6,
      nc.centroid,
      nc.distance_m,
      nc.total_users,
      -- Extract dominant vibe from vibe_counts JSONB
      (
        SELECT key 
        FROM jsonb_each_text(nc.vibe_counts) 
        ORDER BY value::integer DESC 
        LIMIT 1
      ) as dominant_vibe,
      -- Extract dominant vibe count
      (
        SELECT value::integer
        FROM jsonb_each_text(nc.vibe_counts) 
        ORDER BY value::integer DESC 
        LIMIT 1
      ) as dominant_count,
      -- Calculate vibe similarity (1.0 if exact match, decreasing based on difference)
      CASE 
        WHEN (
          SELECT key 
          FROM jsonb_each_text(nc.vibe_counts) 
          ORDER BY value::integer DESC 
          LIMIT 1
        ) = u_vibe THEN 1.0
        ELSE GREATEST(0.1, 1.0 - (0.1 * ABS(
          -- Simple vibe distance calculation (you can improve this with actual vibe similarity mapping)
          COALESCE((
            SELECT ordinality 
            FROM unnest(ARRAY['chill', 'energetic', 'focused', 'social', 'creative', 'romantic', 'adventurous', 'reflective', 'playful']) WITH ORDINALITY 
            WHERE unnest = u_vibe
          ), 5) - 
          COALESCE((
            SELECT ordinality 
            FROM unnest(ARRAY['chill', 'energetic', 'focused', 'social', 'creative', 'romantic', 'adventurous', 'reflective', 'playful']) WITH ORDINALITY 
            WHERE unnest = (
              SELECT key 
              FROM jsonb_each_text(nc.vibe_counts) 
              ORDER BY value::integer DESC 
              LIMIT 1
            )
          ), 5)
        )))
      END as vibe_similarity
    FROM nearby_clusters nc
    WHERE nc.total_users > 0
  )
  SELECT 
    ca.gh6,
    ca.centroid,
    ca.dominant_vibe as dom_vibe,
    ca.vibe_similarity as vibe_match,
    ca.distance_m,
    ca.total_users as user_count
  FROM cluster_analysis ca
  ORDER BY 
    ca.vibe_similarity DESC,
    ca.distance_m ASC
  LIMIT 10;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_compat_clusters(double precision, double precision, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_compat_clusters IS 'Returns compatible vibe clusters near a user location with similarity scoring';