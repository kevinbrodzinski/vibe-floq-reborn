-- ===========================================
--  MIGRATION: fix create_floq → use geometry
-- ===========================================

-- 1. Drop the old versions (if they exist)
DROP FUNCTION IF EXISTS public.create_floq(
    p_lat double precision,
    p_lng double precision,
    p_starts_at timestamptz,
    p_vibe vibe_enum,
    p_visibility text,
    p_title text,
    p_invitees uuid[],
    p_ends_at timestamptz,
    p_flock_type flock_type_enum
);

DROP FUNCTION IF EXISTS public.create_floq(
    p_location geography,
    p_starts_at timestamptz,
    p_vibe vibe_enum,
    p_visibility text,
    p_title text,
    p_invitees uuid[],
    p_ends_at timestamptz,
    p_flock_type flock_type_enum
);

-- 2. Re-create the *primary* lat/lng version (geometry insert)
CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat         double precision,
  p_lng         double precision,
  p_starts_at   timestamptz,
  p_vibe        vibe_enum,
  p_visibility  text DEFAULT 'public',
  p_title       text DEFAULT NULL,
  p_invitees    uuid[] DEFAULT '{}',
  p_ends_at     timestamptz DEFAULT NULL,
  p_flock_type  flock_type_enum DEFAULT 'momentary'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  creator_id uuid := auth.uid();
  computed_ends_at timestamptz;
BEGIN
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_visibility NOT IN ('public','private') THEN
    RAISE EXCEPTION 'visibility must be public or private';
  END IF;

  IF p_flock_type NOT IN ('momentary','persistent') THEN
    RAISE EXCEPTION 'invalid flock_type %', p_flock_type;
  END IF;

  IF p_starts_at < (now() - interval '1 hour') THEN
    RAISE EXCEPTION 'start time cannot be in the past more than 1 h';
  END IF;

  -- ends_at calculation
  IF p_flock_type = 'persistent' THEN
    IF p_ends_at IS NOT NULL THEN
      RAISE EXCEPTION 'persistent floqs cannot supply ends_at';
    END IF;
    computed_ends_at := NULL;
  ELSE
    computed_ends_at := COALESCE(p_ends_at, p_starts_at + interval '4 hours');
  END IF;

  INSERT INTO floqs (
    id, creator_id, location, starts_at, ends_at,
    primary_vibe, visibility, title, flock_type
  )
  VALUES (
    gen_random_uuid(),
    creator_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),   -- *** geometry, no cast ***
    p_starts_at,
    computed_ends_at,
    p_vibe,
    p_visibility,
    COALESCE(NULLIF(p_title,''), 'Untitled'),
    p_flock_type
  )
  RETURNING id INTO new_id;

  INSERT INTO floq_participants (floq_id, user_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', now());

  IF array_length(p_invitees, 1) > 0 THEN
    INSERT INTO floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_id, unnest(p_invitees), 'pending'
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO flock_history (floq_id, user_id, event_type, metadata)
  VALUES (
    new_id,
    creator_id,
    'created',
    jsonb_build_object(
      'flock_type', p_flock_type,
      'visibility', p_visibility,
      'has_end_date', computed_ends_at IS NOT NULL
    )
  );

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_floq TO authenticated;

-- 3. Legacy wrapper that accepts geography/WKT and forwards
CREATE OR REPLACE FUNCTION public.create_floq(
  p_location geography,
  p_starts_at   timestamptz,
  p_vibe        vibe_enum,
  p_visibility  text DEFAULT 'public',
  p_title       text DEFAULT NULL,
  p_invitees    uuid[] DEFAULT '{}',
  p_ends_at     timestamptz DEFAULT NULL,
  p_flock_type  flock_type_enum DEFAULT 'momentary'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.create_floq(
    ST_Y(p_location::geometry),
    ST_X(p_location::geometry),
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

GRANT EXECUTE ON FUNCTION public.create_floq(geography, timestamptz, vibe_enum, text, text, uuid[], timestamptz, flock_type_enum) TO authenticated;