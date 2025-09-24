CREATE OR REPLACE FUNCTION public.create_floq(
  p_location    geography(POINT,4326),
  p_starts_at   timestamptz,
  p_vibe        vibe_enum,
  p_visibility  text DEFAULT 'public',
  p_title       text DEFAULT NULL,
  p_invitees    uuid[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  new_id     uuid;
  creator_id uuid := auth.uid();
BEGIN
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_visibility NOT IN ('public','friends','invite') THEN
    RAISE EXCEPTION 'Invalid visibility %', p_visibility;
  END IF;

  IF p_starts_at < (now() - interval '1 hour') THEN
    RAISE EXCEPTION 'Start time cannot be more than 1 h in past';
  END IF;

  INSERT INTO floqs (creator_id, location, starts_at, primary_vibe,
                     visibility, title)
  VALUES (creator_id, p_location, p_starts_at, p_vibe,
          p_visibility,
          COALESCE(NULLIF(p_title,''), 'Untitled'))
  RETURNING id INTO new_id;

  INSERT INTO floq_participants (floq_id, user_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', now());

  IF cardinality(p_invitees) > 0 THEN
    INSERT INTO floq_participants (floq_id, user_id, role)
    SELECT new_id, uid, 'invited'
    FROM   unnest(p_invitees) AS uid
    WHERE  uid <> creator_id;
  END IF;

  PERFORM pg_notify(
    'floqs_channel',
    json_build_object('event','floq_created',
                      'floq_id',new_id,
                      'creator_id',creator_id)::text
  );

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_floq TO authenticated;