-- Fix get_social_suggestions function that references dropped friend_presence table
-- Update to use current schema with vibes_now and user_vibe_states tables

BEGIN;

-- Drop the broken function
DROP FUNCTION IF EXISTS public.get_social_suggestions(uuid, integer, integer);

-- Create a new version that uses the current schema
CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  p_uid        uuid,
  max_dist_m   integer DEFAULT 1000,
  limit_n      integer DEFAULT 5
)
RETURNS TABLE (
  friend_id    uuid,
  display_name text,
  avatar_url   text,
  vibe_tag     vibe_enum,
  vibe_match   real,
  distance_m   real,
  started_at   timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vn.user_id as friend_id,
    pr.display_name,
    pr.avatar_url,
    vn.vibe::vibe_enum as vibe_tag,
    COALESCE(vibe_similarity(uvs.vibe_tag, vn.vibe::vibe_enum), 0) AS vibe_match,
    ST_DistanceSphere(vn.location::geometry, uvs.location::geometry)::real AS distance_m,
    vn.updated_at as started_at
  FROM public.vibes_now vn
  JOIN public.profiles pr ON pr.id = vn.user_id
  LEFT JOIN LATERAL (
    SELECT v.location, v.vibe_tag
    FROM public.user_vibe_states v
    WHERE v.user_id = p_uid AND v.active
    LIMIT 1
  ) AS uvs ON TRUE
  WHERE vn.user_id != p_uid  -- Exclude self
    AND vn.location IS NOT NULL
    AND uvs.location IS NOT NULL
    AND ST_DistanceSphere(vn.location::geometry, uvs.location::geometry) <= max_dist_m
    AND vn.expires_at > now()  -- Only active vibes
  ORDER BY
    vibe_match DESC,
    distance_m ASC,
    vn.updated_at DESC
  LIMIT limit_n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_social_suggestions(uuid, integer, integer) TO authenticated;

COMMIT; 