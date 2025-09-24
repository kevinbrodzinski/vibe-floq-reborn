-- Fix bump_interaction function type mismatch
-- Change p_venue_id parameter from text to uuid to match the actual column type

CREATE OR REPLACE FUNCTION public.bump_interaction(
  p_profile_id uuid, 
  p_venue_id uuid,  -- Changed from text to uuid
  p_type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_venue_interactions
    (profile_id, venue_id, interaction_type,
     interaction_count, last_interaction_at)
  VALUES
    (p_profile_id, p_venue_id, p_type, 1, now())
  ON CONFLICT (profile_id, venue_id, interaction_type)
  DO UPDATE SET
     interaction_count  = user_venue_interactions.interaction_count + 1,
     last_interaction_at = now();
END;
$$;

-- Grant permission with correct signature
GRANT EXECUTE ON FUNCTION public.bump_interaction(uuid, uuid, text) TO authenticated;