-- Fix type mismatch in people_crossed_paths_today function
DROP FUNCTION IF EXISTS public.people_crossed_paths_today(uuid, integer);

CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(
  in_me uuid DEFAULT auth.uid(),
  proximity_meters integer DEFAULT 25
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  last_seen_at timestamptz,
  distance_meters integer,
  overlap_duration_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return crossed paths from today based on the crossed_paths table
  RETURN QUERY
  SELECT 
    CASE 
      WHEN cp.user_a = in_me THEN cp.user_b
      ELSE cp.user_a
    END as profile_id,
    p.username::text,  -- Cast citext to text
    p.display_name,
    p.avatar_url,
    cp.ts as last_seen_at,
    25 as distance_meters,  -- Default value since we don't store exact distances
    30 as overlap_duration_minutes  -- Default value
  FROM public.crossed_paths cp
  JOIN public.profiles p ON (
    CASE 
      WHEN cp.user_a = in_me THEN cp.user_b
      ELSE cp.user_a
    END = p.id
  )
  WHERE 
    (cp.user_a = in_me OR cp.user_b = in_me)
    AND cp.encounter_date = CURRENT_DATE
    AND CASE 
      WHEN cp.user_a = in_me THEN cp.user_b
      ELSE cp.user_a
    END != in_me;
END;
$function$;