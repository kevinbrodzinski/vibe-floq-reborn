BEGIN;

-- 0. Drop old overload
DROP FUNCTION IF EXISTS public.create_floq(
  double precision, double precision, timestamptz, vibe_enum, text
);

-- 1. Ensure enum
ALTER TYPE flock_type_enum
  ADD VALUE IF NOT EXISTS 'recurring',
  ADD VALUE IF NOT EXISTS 'template';

-- 2. Replace function
CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat           double precision,
  p_lng           double precision,
  p_starts_at     timestamptz,
  p_ends_at       timestamptz DEFAULT NULL,
  p_vibe          vibe_enum,
  p_visibility    text,
  p_title         text,
  p_invitees      uuid[] DEFAULT ARRAY[]::uuid[],
  p_flock_type    text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_floq_id    uuid;
  v_flock_type flock_type_enum;
BEGIN
  BEGIN
    v_flock_type := p_flock_type::flock_type_enum;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_flock_type := 'momentary';
  END;

  INSERT INTO public.floqs (
    creator_id,
    title,
    primary_vibe,
    location,
    starts_at,
    ends_at,
    visibility,
    flock_type,
    max_participants
  ) VALUES (
    auth.uid(),
    p_title,
    p_vibe,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_starts_at,
    p_ends_at,
    p_visibility,
    v_flock_type,
    50
  )
  RETURNING id INTO v_floq_id;

  INSERT INTO public.floq_participants (floq_id, profile_id, role)
  VALUES (v_floq_id, auth.uid(), 'creator')
  ON CONFLICT DO NOTHING;

  -- TODO: process p_invitees in future release

  RETURN v_floq_id;
END;
$$;

COMMIT;