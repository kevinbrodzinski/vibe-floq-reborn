-- Create an overloaded wrapper function for backward compatibility
-- This allows old clients to keep working while we migrate to the new signature

CREATE OR REPLACE FUNCTION public.create_floq(
  p_location    geography(POINT,4326),
  p_starts_at   timestamptz,
  p_vibe        vibe_enum,
  p_visibility  text DEFAULT 'public',
  p_title       text DEFAULT NULL,
  p_invitees    uuid[] DEFAULT '{}',
  p_ends_at     timestamptz DEFAULT NULL,
  p_flock_type  flock_type_enum DEFAULT 'momentary'
) RETURNS uuid
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Extract lat/lng from geography and forward to the new function
  RETURN public.create_floq(
    ST_Y(p_location::geometry),  -- latitude
    ST_X(p_location::geometry),  -- longitude  
    p_starts_at,
    p_vibe,
    p_visibility,
    p_title,
    p_invitees,
    p_ends_at,
    p_flock_type
  );
END;
$$;

-- Ensure proper permissions on the wrapper function
GRANT EXECUTE ON FUNCTION public.create_floq(geography, timestamptz, vibe_enum, text, text, uuid[], timestamptz, flock_type_enum) TO authenticated;