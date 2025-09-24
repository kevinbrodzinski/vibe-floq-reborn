-- Drop all existing upsert_presence function overloads to resolve conflicts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'upsert_presence'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.upsert_presence(%s);',
      r.args
    );
  END LOOP;
END $$;

-- Create the standardized 4-parameter upsert_presence function for vibes_now table
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_vibe       TEXT,
  p_visibility TEXT DEFAULT 'public'
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  v_profile_id UUID := auth.uid();
  v_location   GEOMETRY;
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '90 seconds';
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'Latitude/longitude required';
  END IF;
  IF p_vibe IS NULL THEN
    RAISE EXCEPTION 'Vibe is required';
  END IF;
  IF p_visibility NOT IN ('public','friends') THEN
    RAISE EXCEPTION 'Invalid visibility %', p_visibility;
  END IF;

  v_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

  INSERT INTO public.vibes_now (
    profile_id, location, vibe,
    expires_at, updated_at, visibility)
  VALUES (
    v_profile_id, v_location, p_vibe::public.vibe_enum,
    v_expires_at, NOW(), p_visibility)
  ON CONFLICT (profile_id) DO UPDATE
    SET location   = EXCLUDED.location,
        vibe       = EXCLUDED.vibe,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW(),
        visibility = EXCLUDED.visibility;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_presence(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT)
  TO anon, authenticated;