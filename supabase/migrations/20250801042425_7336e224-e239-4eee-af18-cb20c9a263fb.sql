BEGIN;

/* --------------------------------------------------------------
   create_floq() – ensure flock_type param is a real enum
---------------------------------------------------------------- */

CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat          double precision,
  p_lng          double precision,
  p_starts_at    timestamptz,
  p_vibe         vibe_enum,                  -- chill / hype / etc.
  p_visibility   text DEFAULT 'public',      -- public / friends / private
  p_flock_type   text DEFAULT 'open'         -- incoming text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flock_type flock_type_enum;
  new_floq_id  uuid;
BEGIN
  /* map / cast text to enum, fallback to 'open' */
  BEGIN
    v_flock_type := p_flock_type::flock_type_enum;
  EXCEPTION 
    WHEN invalid_text_representation THEN
      v_flock_type := 'open'::flock_type_enum;
  END;

  INSERT INTO public.floqs (
    location,
    starts_at,
    visibility,
    primary_vibe,
    floq_type,
    creator_id
  ) VALUES (
    ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326),
    p_starts_at,
    p_visibility,
    p_vibe,
    v_flock_type,
    auth.uid()
  )
  RETURNING id INTO new_floq_id;

  RETURN new_floq_id;
END;
$$;

COMMIT;