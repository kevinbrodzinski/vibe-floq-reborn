-- Update get_active_floqs_with_members function with recommended micro-edits
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members(
  p_limit integer DEFAULT 20, 
  p_offset integer DEFAULT 0, 
  p_user_lat double precision DEFAULT NULL, 
  p_user_lng double precision DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  title text, 
  name text, 
  primary_vibe vibe_enum, 
  vibe_tag vibe_enum, 
  type text, 
  starts_at timestamp with time zone, 
  ends_at timestamp with time zone, 
  participant_count bigint, 
  boost_count bigint, 
  starts_in_min integer, 
  distance_meters numeric, 
  members jsonb,
  creator_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
SET row_security TO off
AS $function$
BEGIN
  RETURN QUERY
  WITH floq_with_distance AS (
    SELECT
      f.id,
      f.title,
      f.name,
      f.primary_vibe,
      f.primary_vibe AS vibe_tag,
      COALESCE(f.type, 'auto') AS type,
      f.starts_at,
      f.ends_at,
      f.creator_id,
      CASE 
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
        THEN ST_Distance(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
        )::numeric
        ELSE NULL::numeric
      END AS distance_meters
    FROM public.floqs f
    WHERE f.ends_at > now()
      AND f.visibility = 'public'
      AND f.deleted_at IS NULL
  )
  SELECT
    fwd.id,
    fwd.title,
    fwd.name,
    fwd.primary_vibe,
    fwd.vibe_tag,
    fwd.type,
    fwd.starts_at,
    fwd.ends_at,
    COALESCE(participants.participant_count, 0) AS participant_count,
    COALESCE(boosts.boost_count, 0) AS boost_count,
    GREATEST(0, EXTRACT(EPOCH FROM (fwd.starts_at - now()))/60)::int AS starts_in_min,
    fwd.distance_meters,
    COALESCE(members.members, '[]'::jsonb) AS members,
    fwd.creator_id
  FROM floq_with_distance fwd
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = fwd.id
  ) participants ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS boost_count
    FROM public.floq_boosts fb
    WHERE fb.floq_id = fwd.id 
    AND fb.boost_type = 'vibe'
    AND fb.expires_at > now()
  ) boosts ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'avatar_url', p.avatar_url,
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name
    ) ORDER BY fp.joined_at DESC) AS members
    FROM public.floq_participants fp
    JOIN public.profiles p ON p.id = fp.user_id
    WHERE fp.floq_id = fwd.id
    LIMIT 8
  ) members ON TRUE
  ORDER BY 
    fwd.distance_meters IS NULL,
    fwd.distance_meters,
    boosts.boost_count DESC,
    fwd.starts_at
  LIMIT p_limit OFFSET p_offset;
END;
$function$;