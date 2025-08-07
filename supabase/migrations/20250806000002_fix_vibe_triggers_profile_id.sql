-- Fix all vibe-related triggers and table columns to use profile_id instead of user_id
-- This addresses the "record 'new' has no field 'user_id'" error from triggers

BEGIN;

-- 1. Fix the vibes_now table structure
DO $$
BEGIN
  -- Check if user_id column exists and profile_id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vibes_now' 
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vibes_now' 
    AND column_name = 'profile_id'
  ) THEN
    -- Rename user_id to profile_id
    ALTER TABLE public.vibes_now RENAME COLUMN user_id TO profile_id;
    
    -- Update any constraints that reference the old column name
    ALTER TABLE public.vibes_now DROP CONSTRAINT IF EXISTS vibes_now_pkey;
    ALTER TABLE public.vibes_now ADD CONSTRAINT vibes_now_pkey PRIMARY KEY (profile_id);
  END IF;
END
$$;

-- 2. Fix the user_vibe_states table structure
DO $$
BEGIN
  -- Check if user_id column exists and profile_id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_vibe_states' 
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_vibe_states' 
    AND column_name = 'profile_id'
  ) THEN
    -- Rename user_id to profile_id
    ALTER TABLE public.user_vibe_states RENAME COLUMN user_id TO profile_id;
    
    -- Update indexes
    DROP INDEX IF EXISTS idx_uvs_user_day;
    CREATE INDEX IF NOT EXISTS idx_uvs_profile_day
      ON public.user_vibe_states (profile_id, started_at);
      
    -- Update unique constraints if they exist
    DROP INDEX IF EXISTS user_vibe_states_user_id_started_at_key;
    CREATE UNIQUE INDEX IF NOT EXISTS user_vibe_states_profile_id_started_at_key
      ON public.user_vibe_states (profile_id, started_at);
  END IF;
END
$$;

-- 3. Update the bridge_vibe_data trigger function to use profile_id
CREATE OR REPLACE FUNCTION public.bridge_vibe_data()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
  v_today date := (NEW.updated_at AT TIME ZONE 'UTC')::date;
BEGIN
  IF (TG_OP = 'INSERT'
      OR NEW.vibe IS DISTINCT FROM OLD.vibe)
     AND NEW.vibe IS NOT NULL THEN

    INSERT INTO public.user_vibe_states AS uvs
           (profile_id, vibe_tag, location, started_at, active)
    VALUES (NEW.profile_id, NEW.vibe, NEW.location, NEW.updated_at, true)
    ON CONFLICT (profile_id, started_at)
      DO UPDATE SET
         vibe_tag = EXCLUDED.vibe_tag,
         location = EXCLUDED.location,
         active   = true;

    UPDATE public.user_vibe_states
       SET active = false
     WHERE profile_id = NEW.profile_id
       AND started_at::date = v_today
       AND id <> (SELECT id FROM public.user_vibe_states
                  WHERE profile_id = NEW.profile_id
                    AND started_at::date = v_today
                  ORDER BY started_at DESC
                  LIMIT 1);

  END IF;

  RETURN NEW;
END;
$$;

-- 4. Update set_user_vibe function to handle both vibe_enum and text parameters
-- Drop all existing overloads first
DROP FUNCTION IF EXISTS public.set_user_vibe(vibe_enum, double precision, double precision);
DROP FUNCTION IF EXISTS public.set_user_vibe(text, double precision, double precision);

-- Create the main function that accepts vibe_enum
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

-- Create text overload that converts to vibe_enum
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

-- 5. Update clear_user_vibe function
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.set_user_vibe(vibe_enum, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_vibe(text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_user_vibe() TO authenticated;

-- 7. Update any RLS policies that might reference user_id
DO $$
BEGIN
  -- Update RLS policies for user_vibe_states if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_vibe_states'
    AND policyname = 'user_vibe_states_policy'
  ) THEN
    DROP POLICY IF EXISTS user_vibe_states_policy ON public.user_vibe_states;
  END IF;
  
  -- Create new RLS policy using profile_id
  CREATE POLICY user_vibe_states_policy ON public.user_vibe_states
    FOR ALL USING (profile_id = auth.uid());
    
  -- Same for vibes_now table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'vibes_now'
    AND policyname = 'vibes_now_policy'
  ) THEN
    DROP POLICY IF EXISTS vibes_now_policy ON public.vibes_now;
  END IF;
  
  CREATE POLICY vibes_now_policy ON public.vibes_now
    FOR ALL USING (profile_id = auth.uid());
END
$$;

-- 8. Ensure RLS is enabled
ALTER TABLE public.user_vibe_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes_now ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Add helpful comment
COMMENT ON FUNCTION public.set_user_vibe(vibe_enum, double precision, double precision) IS 
'Sets user vibe with optional location. Uses profile_id from auth.uid() instead of user_id.';

COMMENT ON FUNCTION public.set_user_vibe(text, double precision, double precision) IS 
'Sets user vibe with optional location. Accepts text vibe that gets converted to vibe_enum.';

COMMENT ON FUNCTION public.clear_user_vibe() IS 
'Clears active user vibe. Uses profile_id from auth.uid() instead of user_id.';