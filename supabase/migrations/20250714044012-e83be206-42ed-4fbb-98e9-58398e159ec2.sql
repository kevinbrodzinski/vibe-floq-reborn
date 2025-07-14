-- Enhanced create_floq function with duration guards and SRID enforcement
CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat double precision,
  p_lng double precision,
  p_starts_at timestamp with time zone,
  p_vibe vibe_enum,
  p_visibility text DEFAULT 'public'::text,
  p_title text DEFAULT NULL::text,
  p_invitees uuid[] DEFAULT '{}'::uuid[],
  p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_flock_type flock_type_enum DEFAULT 'momentary'::flock_type_enum
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Duration guard for momentary floqs
  IF p_flock_type = 'momentary' 
     AND p_ends_at IS NOT NULL 
     AND p_ends_at > p_starts_at + interval '24 hours' THEN
    RAISE EXCEPTION 'Momentary floqs cannot exceed 24 hours';
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

  -- Ensure SRID=4326 for geography
  INSERT INTO floqs (
    id, creator_id, location, starts_at, ends_at,
    primary_vibe, visibility, title, flock_type
  )
  VALUES (
    gen_random_uuid(),
    creator_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_starts_at,
    computed_ends_at,
    p_vibe,
    p_visibility,
    COALESCE(NULLIF(p_title,''), 'Untitled'),
    p_flock_type
  )
  RETURNING id INTO new_id;

  -- Add creator as participant with conflict resolution
  INSERT INTO floq_participants (floq_id, user_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', now())
  ON CONFLICT (floq_id, user_id) DO NOTHING;

  -- Handle invitations with null safety
  IF array_length(p_invitees, 1) > 0 THEN
    INSERT INTO floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_id, unnest(p_invitees), 'pending'
    ON CONFLICT (floq_id, invitee_id) DO NOTHING;
  END IF;

  -- Log creation event
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

  -- Notify for real-time updates
  PERFORM pg_notify(
    'floqs_channel',
    json_build_object(
      'event', 'floq_created',
      'floq_id', new_id,
      'creator_id', creator_id
    )::text
  );

  RETURN new_id;
END;
$$;