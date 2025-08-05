BEGIN;

CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat          double precision,
  p_lng          double precision,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_vibe         vibe_enum,
  p_visibility   text,
  p_title        text,
  p_invitees     uuid[],
  p_flock_type   text          -- incoming as TEXT
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id        uuid;
  creator_id    uuid := auth.uid();
  v_flock_type  flock_type_enum := 'momentary';   -- ← default enum value
BEGIN
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  /* safe cast with fallback */
  BEGIN
    v_flock_type := p_flock_type::flock_type_enum;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_flock_type := 'momentary';
  END;

  INSERT INTO public.floqs (
    id, creator_id, location, starts_at, ends_at,
    primary_vibe, visibility, title, flock_type
  ) VALUES (
    gen_random_uuid(),
    creator_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326),
    p_starts_at,
    p_ends_at,
    p_vibe,
    p_visibility,
    COALESCE(NULLIF(p_title,''),'Untitled'),
    v_flock_type          -- ✅ enum value, never raw text
  ) RETURNING id INTO new_id;

  /* rest of body unchanged */
  INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', NOW())
  ON CONFLICT (floq_id, profile_id) DO NOTHING;

  IF array_length(p_invitees,1) > 0 THEN
    INSERT INTO public.floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_id, unnest(p_invitees), 'pending'
    ON CONFLICT (floq_id, invitee_id) DO NOTHING;
  END IF;

  /* … history + notify unchanged … */

  RETURN new_id;
END;
$$;

COMMIT;