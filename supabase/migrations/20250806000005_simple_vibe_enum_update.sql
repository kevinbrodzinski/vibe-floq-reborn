-- Simple vibe_enum update - adds any missing vibe values
-- Use this if you just want to ensure all vibes are available without changing order

-- Current database enum order: 'chill','hype','curious','social','solo','romantic','weird','down','flowing','open'
-- Frontend VIBES array order:  'chill','flowing','romantic','hype','weird','solo','social','open','down','curious'

-- This migration ensures all vibes are available in the database
-- Note: PostgreSQL enum order cannot be changed easily, but this ensures compatibility

BEGIN;

-- Check if any vibes are missing and add them
-- (This is a no-op if all vibes already exist, which they should)

-- Verify all required vibes exist
DO $$
DECLARE
    required_vibes TEXT[] := ARRAY['chill','flowing','romantic','hype','weird','solo','social','open','down','curious'];
    existing_vibes TEXT[];
    missing_vibe TEXT;
BEGIN
    -- Get existing enum values
    SELECT ARRAY_AGG(enumlabel::TEXT ORDER BY enumlabel) 
    INTO existing_vibes
    FROM pg_enum 
    WHERE enumtypid = 'public.vibe_enum'::regtype;
    
    -- Check for missing vibes
    FOREACH missing_vibe IN ARRAY required_vibes
    LOOP
        IF NOT (missing_vibe = ANY(existing_vibes)) THEN
            -- Add missing vibe (this shouldn't happen with current schema)
            EXECUTE format('ALTER TYPE public.vibe_enum ADD VALUE %L', missing_vibe);
            RAISE NOTICE 'Added missing vibe: %', missing_vibe;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Vibe enum verification complete. All required vibes are present.';
END $$;

-- Ensure set_user_vibe functions are properly defined
-- (Re-create them to ensure they work with current enum)

DROP FUNCTION IF EXISTS public.set_user_vibe(vibe_enum, double precision, double precision);
DROP FUNCTION IF EXISTS public.set_user_vibe(text, double precision, double precision);

-- Main set_user_vibe function (vibe_enum parameter)
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
  SELECT user_profile_id, new_vibe::text, loc, NOW(), TRUE
  FROM   pt
  ON CONFLICT (profile_id, started_at) DO UPDATE
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

-- Text overload for set_user_vibe
CREATE OR REPLACE FUNCTION public.set_user_vibe(
  new_vibe  text,
  lat       double precision DEFAULT NULL,
  lng       double precision DEFAULT NULL
)
RETURNS user_vibe_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Convert text to vibe_enum and call the main function
  RETURN public.set_user_vibe(new_vibe::vibe_enum, lat, lng);
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid vibe: %. Must be one of the valid vibe enum values.', new_vibe;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.set_user_vibe(vibe_enum, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_vibe(text, double precision, double precision) TO authenticated;

-- Add helpful comments
COMMENT ON TYPE public.vibe_enum IS 
'Enum for vibe types. Contains all 10 canonical vibes used by the application.';

COMMENT ON FUNCTION public.set_user_vibe(vibe_enum, double precision, double precision) IS
'Sets user vibe with optional location. Uses profile_id from auth.uid().';

COMMIT;

-- Verification queries (run these after migration to confirm)
/*
-- Check all enum values and their order
SELECT enumlabel, enumsortorder 
FROM pg_enum 
WHERE enumtypid = 'public.vibe_enum'::regtype 
ORDER BY enumsortorder;

-- Count total vibes (should be 10)
SELECT COUNT(*) as total_vibes
FROM pg_enum 
WHERE enumtypid = 'public.vibe_enum'::regtype;
*/