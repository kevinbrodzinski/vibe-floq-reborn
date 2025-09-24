-- Enhanced set_user_vibe function with proper indexes and RLS
-- Fix unique index to be partial (active rows only) and add composite index for MV refresh

-- Enable RLS on user_vibe_states and vibes_now
ALTER TABLE public.user_vibe_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes_now ENABLE ROW LEVEL SECURITY;

-- Create partial unique index on user_id (active rows only) to avoid collisions
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_vibe_active 
ON public.user_vibe_states(user_id) WHERE active;

-- Create composite index for MV refresh (active rows with started_at)
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_active_started 
ON public.user_vibe_states(started_at) WHERE active;

-- Optional vibe-based index for analytics
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_vibe 
ON public.user_vibe_states(vibe_tag) WHERE active;

-- Enhanced set_user_vibe function with lat/lng support and proper error handling
CREATE OR REPLACE FUNCTION public.set_user_vibe(
  new_vibe text,
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  loc geography := CASE
    WHEN lat IS NOT NULL AND lng IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ELSE (SELECT location FROM public.vibes_now WHERE user_id = auth.uid())
  END;
BEGIN
  -- Validate vibe enum
  BEGIN
    PERFORM new_vibe::vibe_enum;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid vibe: %. Must be one of the valid vibe types.', new_vibe;
  END;

  -- Deactivate previous active state
  UPDATE public.user_vibe_states
  SET active = FALSE
  WHERE user_id = auth.uid()
    AND active;

  -- Insert new active vibe state
  INSERT INTO public.user_vibe_states (
    user_id, vibe_tag, location, active, visible_to, started_at
  )
  VALUES (
    auth.uid(),
    new_vibe::vibe_enum,
    loc,
    TRUE,
    COALESCE(
      (SELECT visible_to FROM public.user_vibe_states WHERE user_id = auth.uid() LIMIT 1),
      'public'
    ),
    statement_timestamp()
  );

  -- Upsert into real-time table
  INSERT INTO public.vibes_now (
    user_id, vibe, location, updated_at, visibility
  )
  VALUES (
    auth.uid(),
    new_vibe::vibe_enum,
    loc,
    statement_timestamp(),
    'public'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET vibe = EXCLUDED.vibe,
        location = COALESCE(EXCLUDED.location, public.vibes_now.location),
        updated_at = EXCLUDED.updated_at;

EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'Failed to set user vibe: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_user_vibe(text, double precision, double precision) TO authenticated;