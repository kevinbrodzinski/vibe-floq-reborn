-- Fix both set_user_vibe and clear_user_vibe functions to use profile_id instead of user_id
-- This addresses the error: record "new" has no field "user_id"

-- 1. Fix set_user_vibe function
DROP FUNCTION IF EXISTS public.set_user_vibe(vibe_enum, double precision, double precision);

CREATE OR REPLACE FUNCTION public.set_user_vibe(
  new_vibe  vibe_enum,
  lat       double precision DEFAULT NULL,
  lng       double precision DEFAULT NULL
)
RETURNS user_vibe_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result_row user_vibe_states;
  user_profile_id uuid;
BEGIN
  -- Get the user's profile_id from auth.uid()
  SELECT id INTO user_profile_id 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for authenticated user';
  END IF;

  WITH pt AS (
    SELECT CASE
             WHEN lat IS NULL OR lng IS NULL
                THEN (
                  SELECT location
                  FROM   public.user_vibe_states
                  WHERE  profile_id = user_profile_id AND active
                  LIMIT 1
                )
             ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
           END AS loc
  )
  INSERT INTO public.user_vibe_states (profile_id, vibe_tag, location, started_at, active)
  SELECT user_profile_id, new_vibe, loc, NOW(), TRUE
  FROM   pt
  ON CONFLICT (profile_id) DO UPDATE
    SET vibe_tag   = COALESCE(EXCLUDED.vibe_tag, user_vibe_states.vibe_tag),
        location   = COALESCE(EXCLUDED.location, user_vibe_states.location),
        started_at = CASE
                       WHEN user_vibe_states.vibe_tag <> EXCLUDED.vibe_tag
                       THEN NOW() ELSE user_vibe_states.started_at
                     END,
        active     = TRUE
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$$;

-- 2. Fix clear_user_vibe function
DROP FUNCTION IF EXISTS public.clear_user_vibe();

CREATE OR REPLACE FUNCTION public.clear_user_vibe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_profile_id uuid;
BEGIN
  -- Get the user's profile_id from auth.uid()
  SELECT id INTO user_profile_id 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for authenticated user';
  END IF;

  UPDATE public.user_vibe_states
     SET active = false
   WHERE profile_id = user_profile_id
     AND active;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.set_user_vibe(vibe_enum, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_user_vibe() TO authenticated;