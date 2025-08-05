-- Drop any stray geography overload to prevent conflicts
DROP FUNCTION IF EXISTS public.set_user_vibe(vibe_enum, geography, geography);
DROP FUNCTION IF EXISTS public.set_user_vibe(vibe_enum, double precision, double precision);
DROP FUNCTION IF EXISTS public.set_user_vibe(text, double precision, double precision);

-- Recreate the single, geometry-only version that returns the row
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
BEGIN
  WITH pt AS (
    SELECT CASE
             WHEN lat IS NULL OR lng IS NULL
                THEN (
                  SELECT location
                  FROM   public.user_vibe_states
                  WHERE  user_id = auth.uid() AND active
                  LIMIT 1
                )
             ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
           END AS loc
  )
  INSERT INTO public.user_vibe_states (user_id, vibe_tag, location, started_at, active)
  SELECT auth.uid(), new_vibe, loc, NOW(), TRUE
  FROM   pt
  ON CONFLICT (user_id) DO UPDATE
    SET vibe_tag   = EXCLUDED.vibe_tag,
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