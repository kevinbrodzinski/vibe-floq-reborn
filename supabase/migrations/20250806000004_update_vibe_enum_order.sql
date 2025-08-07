-- Update vibe_enum to match frontend VIBES array order
-- This ensures consistency between database and frontend vibe ordering

BEGIN;

-- Step 1: Create a new enum with the correct order
CREATE TYPE public.vibe_enum_new AS ENUM (
  'chill',
  'flowing', 
  'romantic',
  'hype',
  'weird',
  'solo',
  'social',
  'open',
  'down',
  'curious'
);

-- Step 2: Update all columns that use vibe_enum to use the new enum
-- We'll do this by casting through text to avoid enum ordering issues

-- Update vibes_now table
ALTER TABLE public.vibes_now 
  ALTER COLUMN vibe TYPE vibe_enum_new USING vibe::text::vibe_enum_new;

-- Update user_vibe_states table  
ALTER TABLE public.user_vibe_states 
  ALTER COLUMN vibe_tag TYPE vibe_enum_new USING vibe_tag::text::vibe_enum_new;

-- Update floq_plans table if it exists and has vibe columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'floq_plans' 
    AND column_name = 'primary_vibe' 
    AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.floq_plans ALTER COLUMN primary_vibe TYPE vibe_enum_new USING primary_vibe::text::vibe_enum_new';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'floq_plans' 
    AND column_name = 'vibe_tag' 
    AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.floq_plans ALTER COLUMN vibe_tag TYPE vibe_enum_new USING vibe_tag::text::vibe_enum_new';
  END IF;
END $$;

-- Update floqs table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'floqs' 
    AND column_name = 'primary_vibe' 
    AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.floqs ALTER COLUMN primary_vibe TYPE vibe_enum_new USING primary_vibe::text::vibe_enum_new';
  END IF;
END $$;

-- Update vibe_clusters table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vibe_clusters' 
    AND column_name = 'dominant_vibe' 
    AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.vibe_clusters ALTER COLUMN dominant_vibe TYPE vibe_enum_new USING dominant_vibe::text::vibe_enum_new';
  END IF;
END $$;

-- Update any other tables that might use vibe_enum
-- Add more tables here as needed based on your schema

-- Step 3: Update function signatures that use vibe_enum
-- Drop and recreate functions with the new enum type

-- Update set_user_vibe functions
DROP FUNCTION IF EXISTS public.set_user_vibe(vibe_enum, double precision, double precision);
CREATE OR REPLACE FUNCTION public.set_user_vibe(
  new_vibe  vibe_enum_new,
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
DROP FUNCTION IF EXISTS public.set_user_vibe(text, double precision, double precision);
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
  -- Convert text to vibe_enum_new and call the main function
  RETURN public.set_user_vibe(new_vibe::vibe_enum_new, lat, lng);
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid vibe: %. Must be one of the valid vibe enum values.', new_vibe;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.set_user_vibe(vibe_enum_new, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_vibe(text, double precision, double precision) TO authenticated;

-- Step 4: Drop the old enum and rename the new one
DROP TYPE public.vibe_enum CASCADE;
ALTER TYPE public.vibe_enum_new RENAME TO vibe_enum;

-- Step 5: Add helpful comments
COMMENT ON TYPE public.vibe_enum IS 
'Enum for vibe types, ordered to match frontend VIBES array for consistency';

COMMENT ON FUNCTION public.set_user_vibe(vibe_enum, double precision, double precision) IS
'Sets user vibe with optional location. Uses profile_id from auth.uid(). Updated to use reordered vibe_enum.';

COMMIT;

-- Verification query (run this after the migration to confirm)
-- SELECT enumlabel, enumsortorder FROM pg_enum WHERE enumtypid = 'vibe_enum'::regtype ORDER BY enumsortorder;