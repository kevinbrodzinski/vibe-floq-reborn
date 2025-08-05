-- Create get_nearby_floqs RPC function for optimized floq discovery
-- This replaces the stubbed floq functionality in useSmartDiscovery

CREATE OR REPLACE FUNCTION public.get_nearby_floqs(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer DEFAULT 1000,
  p_primary_vibe vibe_enum DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  distance_m double precision,
  primary_vibe vibe_enum,
  participant_count bigint,
  max_participants integer,
  description text,
  address text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  creator_name text,
  creator_avatar text,
  is_private boolean,
  is_joined boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    ST_DistanceSphere(
      f.location::geometry, 
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    )::double precision AS distance_m,
    f.primary_vibe,
    COALESCE(pc.participant_count, 0) AS participant_count,
    f.max_participants,
    f.description,
    f.address,
    f.starts_at,
    f.ends_at,
    p.display_name AS creator_name,
    p.avatar_url AS creator_avatar,
    f.is_private,
    COALESCE(fp_user.profile_id IS NOT NULL, false) AS is_joined
  FROM public.floqs f
  LEFT JOIN public.profiles p ON p.id = f.creator_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = f.id
  ) pc ON true
  LEFT JOIN public.floq_participants fp_user ON (
    fp_user.floq_id = f.id AND fp_user.profile_id = auth.uid()
  )
  WHERE f.deleted_at IS NULL
    AND f.ends_at > now()
    AND f.location IS NOT NULL
    AND ST_DWithin(
      f.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    AND (p_primary_vibe IS NULL OR f.primary_vibe = p_primary_vibe)
  ORDER BY distance_m ASC, f.starts_at ASC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_nearby_floqs(double precision, double precision, integer, vibe_enum, integer) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_nearby_floqs IS 'Returns nearby floqs within specified radius, with optional vibe filtering and participant counts';