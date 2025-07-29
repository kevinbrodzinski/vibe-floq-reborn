-- Fix all floq functions to use profile_id instead of user_id
-- This migration updates all the get_*_floqs_with_members functions

-- 1. Fix get_visible_floqs_with_members
CREATE OR REPLACE FUNCTION public.get_visible_floqs_with_members(
  p_use_demo   boolean DEFAULT false,
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0,
  p_user_lat   double precision DEFAULT NULL,
  p_user_lng   double precision DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'description', f.description,
    'creator_id', f.creator_id,
    'created_at', f.created_at,
    'updated_at', f.updated_at,
    'status', f.status,
    'participant_count', COUNT(fp.profile_id),
    'distance_meters', CASE 
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL 
      THEN ST_Distance(
        ST_MakePoint(f.location_lng, f.location_lat)::geography,
        ST_MakePoint(p_user_lng, p_user_lat)::geography
      )
      ELSE NULL
    END
  )
  FROM public.floqs f
  LEFT JOIN public.floq_participants fp ON fp.floq_id = f.id
  LEFT JOIN public.profiles p ON p.id = fp.profile_id
  WHERE f.status = 'active'
  AND (p_use_demo OR f.is_demo = false)
  GROUP BY f.id, f.name, f.description, f.creator_id, f.created_at, f.updated_at, f.status, f.location_lat, f.location_lng
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 2. Fix get_demo_floqs_with_members
CREATE OR REPLACE FUNCTION public.get_demo_floqs_with_members(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'description', f.description,
    'creator_id', f.creator_id,
    'created_at', f.created_at,
    'updated_at', f.updated_at,
    'status', f.status,
    'participant_count', COUNT(fp.profile_id)
  )
  FROM public.floqs f
  LEFT JOIN public.floq_participants fp ON fp.floq_id = f.id
  LEFT JOIN public.profiles p ON p.id = fp.profile_id
  WHERE f.status = 'active' AND f.is_demo = true
  GROUP BY f.id, f.name, f.description, f.creator_id, f.created_at, f.updated_at, f.status
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. Fix get_nearby_floqs_with_members
CREATE OR REPLACE FUNCTION public.get_nearby_floqs_with_members(
  p_user_lat double precision,
  p_user_lng double precision,
  p_radius_meters integer DEFAULT 5000,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'description', f.description,
    'creator_id', f.creator_id,
    'created_at', f.created_at,
    'updated_at', f.updated_at,
    'status', f.status,
    'participant_count', COUNT(fp.profile_id),
    'distance_meters', ST_Distance(
      ST_MakePoint(f.location_lng, f.location_lat)::geography,
      ST_MakePoint(p_user_lng, p_user_lat)::geography
    )
  )
  FROM public.floqs f
  LEFT JOIN public.floq_participants fp ON fp.floq_id = f.id
  LEFT JOIN public.profiles p ON p.id = fp.profile_id
  WHERE f.status = 'active'
  AND f.is_demo = false
  AND ST_DWithin(
    ST_MakePoint(f.location_lng, f.location_lat)::geography,
    ST_MakePoint(p_user_lng, p_user_lat)::geography,
    p_radius_meters
  )
  GROUP BY f.id, f.name, f.description, f.creator_id, f.created_at, f.updated_at, f.status, f.location_lat, f.location_lng
  ORDER BY ST_Distance(
    ST_MakePoint(f.location_lng, f.location_lat)::geography,
    ST_MakePoint(p_user_lng, p_user_lat)::geography
  )
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4. Fix get_friend_floqs_with_members
CREATE OR REPLACE FUNCTION public.get_friend_floqs_with_members(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'description', f.description,
    'creator_id', f.creator_id,
    'created_at', f.created_at,
    'updated_at', f.updated_at,
    'status', f.status,
    'participant_count', COUNT(fp.profile_id)
  )
  FROM public.floqs f
  INNER JOIN public.floq_participants fp ON fp.floq_id = f.id
  INNER JOIN public.profiles p ON p.id = fp.profile_id
  INNER JOIN public.friends fr ON (fr.user_id = p_user_id AND fr.friend_id = p.id)
  WHERE f.status = 'active'
  AND f.is_demo = false
  GROUP BY f.id, f.name, f.description, f.creator_id, f.created_at, f.updated_at, f.status
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$; 