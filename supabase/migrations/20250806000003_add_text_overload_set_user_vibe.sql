-- Add missing text overload for set_user_vibe function
-- This allows the frontend to call set_user_vibe with string parameters

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.set_user_vibe(text, double precision, double precision) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.set_user_vibe(text, double precision, double precision) IS 
'Sets user vibe with optional location. Accepts text vibe that gets converted to vibe_enum. Uses profile_id from auth.uid().';