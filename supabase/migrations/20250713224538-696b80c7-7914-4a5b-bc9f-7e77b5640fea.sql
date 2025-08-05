-- Drop existing create_floq function variants and create the new one
DROP FUNCTION IF EXISTS public.create_floq(geography, timestamptz, vibe_enum, text, text, uuid[], timestamptz, flock_type_enum);
DROP FUNCTION IF EXISTS public.create_floq(geography, timestamptz, vibe_enum, text, text, uuid[]);
DROP FUNCTION IF EXISTS public.create_floq(geometry, timestamptz, vibe_enum, text, text, uuid[]);

-- Create the new create_floq function with lat/lng parameters
CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat            double precision,
  p_lng            double precision,
  p_starts_at      timestamptz,
  p_vibe           vibe_enum,
  p_visibility     text DEFAULT 'public',
  p_title          text DEFAULT NULL,
  p_invitees       uuid[] DEFAULT '{}',
  p_ends_at        timestamptz DEFAULT NULL,
  p_flock_type     flock_type_enum DEFAULT 'momentary'
) RETURNS uuid
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_id     uuid;
  creator_id uuid := auth.uid();
  computed_ends_at timestamptz;
BEGIN
  -- **RLS bypass comment** | Because the function is **SECURITY DEFINER**, it runs as 'postgres' (or whichever owner)
  -- This allows bypassing RLS policies for internal operations while still maintaining security through function permissions
  
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Visibility validation with better error details
  IF p_visibility NOT IN ('public','private') THEN
    RAISE EXCEPTION 'Invalid visibility %. Must be public or private', p_visibility;
  END IF;

  -- Flock type validation with better error details
  IF p_flock_type NOT IN ('momentary', 'persistent') THEN
    RAISE EXCEPTION 'Invalid flock_type %. Must be momentary or persistent', p_flock_type;
  END IF;

  -- Time validation - prevent past dates (with 1 hour grace period)
  IF p_starts_at < (now() - interval '1 hour') THEN
    RAISE EXCEPTION 'Start time cannot be more than 1 h in past';
  END IF;
  
  -- Optional: Add upper bound check for future dates
  IF p_starts_at > (now() + interval '30 days') THEN
    RAISE EXCEPTION 'Start time cannot be more than 30 days in future';
  END IF;

  -- Set ends_at based on flock_type and provided value
  IF p_flock_type = 'persistent' THEN
    IF p_ends_at IS NOT NULL THEN
      RAISE EXCEPTION 'Persistent floqs cannot have an end time';
    END IF;
    computed_ends_at := NULL;
  ELSE
    -- For momentary floqs, use provided ends_at or default to 4 hours
    computed_ends_at := COALESCE(p_ends_at, p_starts_at + interval '4 hours');
  END IF;

  -- Create the floq with server-side geography construction
  INSERT INTO floqs (creator_id, location, starts_at, ends_at, primary_vibe,
                     visibility, title, flock_type)
  VALUES (creator_id, 
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_starts_at, 
          computed_ends_at, 
          p_vibe,
          p_visibility,
          COALESCE(NULLIF(p_title,''), 'Untitled'),
          p_flock_type)
  RETURNING id INTO new_id;

  -- Insert creator as participant with 'creator' role
  INSERT INTO floq_participants (floq_id, user_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', now());

  -- Handle invitations with conflict resolution and self-invite filtering
  IF array_length(p_invitees, 1) > 0 THEN
    INSERT INTO floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_id, unnest(p_invitees), 'pending'
    WHERE unnest(p_invitees) <> creator_id  -- Filter out self-invites
    ON CONFLICT DO NOTHING;
  END IF;

  -- Log creation event with consistent enum naming
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

  -- Send notification for realtime updates
  PERFORM pg_notify(
    'floqs_channel',
    json_build_object('event','floq_created',
                      'floq_id',new_id,
                      'creator_id',creator_id,
                      'flock_type',p_flock_type)::text
  );

  RETURN new_id;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.create_floq TO authenticated;

-- Create GIST index on location for fast proximity queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_floqs_location_gist ON public.floqs USING GIST(location);