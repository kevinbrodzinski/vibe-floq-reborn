-- Batch Function Updates with Transaction Safety
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- WARNING: This script updates ALL functions that reference user_id to use profile_id
-- Only run this after confirming all tables have profile_id columns

-- Set extended timeout for long-running operations
SET statement_timeout = '120min';

-- Begin transaction for atomicity
BEGIN;

-- Log start of batch operation
DO $$
BEGIN
    RAISE NOTICE 'Starting batch function updates at %', now();
END $$;

-- Update attempt_claim_username function
CREATE OR REPLACE FUNCTION public.attempt_claim_username(desired citext)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_profile_id uuid;
  normalized_username citext;
BEGIN
  -- Guard against NULL auth.uid()
  current_profile_id := auth.uid();
  IF current_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  -- Normalize input: trim whitespace and convert to lowercase
  normalized_username := LOWER(TRIM(desired::text))::citext;
  
  -- Validate format (3-32 alphanumeric plus underscore)
  IF NOT (normalized_username ~ '^[a-z0-9_]{3,32}$') THEN
    RETURN false;
  END IF;

  -- Single-statement UPSERT with conflict handling
  INSERT INTO profiles (id, username)
  VALUES (current_profile_id, normalized_username)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
  WHERE profiles.username IS NULL OR profiles.username = '';
  
  -- Check if update was successful (no constraint violations)
  RETURN FOUND;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
  WHEN check_violation THEN  
    RETURN false;
END;
$$;

-- Update create_floq function
CREATE OR REPLACE FUNCTION public.create_floq(
  p_lat double precision,
  p_lng double precision,
  p_vibe vibe_enum,
  p_starts_at timestamptz,
  p_ends_at timestamptz DEFAULT NULL,
  p_visibility text DEFAULT 'public',
  p_title text DEFAULT '',
  p_flock_type text DEFAULT 'momentary',
  p_invitees uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
  creator_profile_id uuid := auth.uid();
  computed_ends_at timestamptz;
BEGIN
  IF creator_profile_id IS NULL THEN
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

  -- Insert with proper geometry casting to match floqs.location column type
  INSERT INTO floqs (
    id, creator_id, location, starts_at, ends_at,
    primary_vibe, visibility, title, flock_type
  )
  VALUES (
    gen_random_uuid(),
    creator_profile_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geometry,
    p_starts_at,
    computed_ends_at,
    p_vibe,
    p_visibility,
    COALESCE(NULLIF(p_title,''), 'Untitled'),
    p_flock_type
  )
  RETURNING id INTO new_id;

  -- Add creator as participant with conflict resolution
  INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_id, creator_profile_id, 'creator', now())
  ON CONFLICT (floq_id, profile_id) DO NOTHING;

  -- Handle invitations with null safety
  IF array_length(p_invitees, 1) > 0 THEN
    INSERT INTO floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_profile_id, unnest(p_invitees), 'pending'
    ON CONFLICT (floq_id, invitee_id) DO NOTHING;
  END IF;

  -- Log creation event
  INSERT INTO flock_history (floq_id, profile_id, event_type, metadata)
  VALUES (
    new_id,
    creator_profile_id,
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
      'creator_id', creator_profile_id
    )::text
  );

  RETURN new_id;
END;
$$;

-- Update friends_nearby function
CREATE OR REPLACE FUNCTION public.friends_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  display_name text,
  avatar_url text,
  lat double precision,
  lng double precision,
  distance_m double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- caller's friendship set
  my_friends AS (
    SELECT CASE 
             WHEN f.profile_id = auth.uid() THEN f.friend_id
             ELSE f.profile_id
           END AS friend_id
    FROM public.friendships f
    WHERE f.profile_id = auth.uid() OR f.friend_id = auth.uid()
  ),

  -- latest presence rows for those friends
  friend_presence AS (
    SELECT DISTINCT ON (v.profile_id)
           v.profile_id,
           v.geo,
           ST_Y(v.location::geometry) as lat,
           ST_X(v.location::geometry) as lng,
           v.updated_at
    FROM public.vibes_now v
    JOIN my_friends mf ON mf.friend_id = v.profile_id
    WHERE v.expires_at > NOW()
    ORDER BY v.profile_id, v.updated_at DESC
  )

  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    fp.lat,
    fp.lng,
    ST_Distance(
      fp.geo,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat),4326)::geography
    )   AS distance_m
  FROM friend_presence fp
  JOIN public.profiles p ON p.id = fp.profile_id
  WHERE ST_DWithin(
          fp.geo,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat),4326)::geography,
          radius_km * 1000  -- metres
        )
  ORDER BY distance_m
  LIMIT 50;
END;
$$;

-- Update log_presence_if_needed function
CREATE OR REPLACE FUNCTION public.log_presence_if_needed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _geo geography := geography(st_makepoint(ST_X(NEW.location), ST_Y(NEW.location)));
BEGIN
  IF public.should_log_presence(NEW.profile_id, _geo) THEN
    INSERT INTO public.vibes_log (profile_id, ts, location, venue_id, vibe)
    VALUES (NEW.profile_id, NEW.updated_at, _geo, NEW.venue_id, NEW.vibe);
  END IF;
  RETURN NULL; -- AFTER trigger -> don't modify NEW
END;
$$;

-- Update presence_nearby function
CREATE OR REPLACE FUNCTION public.presence_nearby(
  lat double precision,
  lng double precision,
  km double precision DEFAULT 1,
  include_self boolean DEFAULT false
)
RETURNS TABLE(
  user_profile_id uuid,
  vibe vibe_enum,
  location geometry,
  updated_at timestamptz,
  expires_at timestamptz,
  visibility text,
  venue_id uuid,
  geo geography
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.profile_id as user_profile_id,
    v.vibe,
    v.location,
    v.updated_at,
    v.expires_at,
    v.visibility,
    v.venue_id,
    v.geo
  FROM public.vibes_now v
  WHERE ST_DWithin(
          v.geo,
          ST_MakePoint(lng, lat)::geography,
          km * 1000
        )
    AND v.expires_at > NOW()
    AND (include_self OR v.profile_id <> auth.uid())
    AND (
          COALESCE(v.visibility,'public') = 'public'
       OR (v.visibility = 'friends'
           AND EXISTS (
                 SELECT 1
                 FROM public.friendships f
                 WHERE (f.profile_id   = auth.uid() AND f.friend_id = v.profile_id)
                    OR (f.friend_id = auth.uid() AND f.profile_id   = v.profile_id)
               )
          )
        );
END;
$$;

-- Update should_log_presence function
CREATE OR REPLACE FUNCTION public.should_log_presence(
  p_profile uuid,
  p_loc geography,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  _last_ts timestamptz;
  _last_loc geography;
BEGIN
  -- Most-recent row for *today* (avoids scanning large history)
  SELECT ts, location
    INTO _last_ts, _last_loc
    FROM public.vibes_log
   WHERE profile_id = p_profile
     AND ts >= date_trunc('day', p_now)
   ORDER BY ts DESC
   LIMIT 1;

  -- First row today → log
  IF _last_ts IS NULL THEN
    RETURN true;
  END IF;

  -- 30-second cadence
  IF p_now - _last_ts >= interval '30 seconds' THEN
    RETURN true;
  END IF;

  -- 10-metre movement
  IF st_distance(_last_loc, p_loc) >= 10 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Update upsert_presence function
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_lat double precision,
  p_lng double precision,
  p_vibe text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  insert into public.vibes_now as v (
    profile_id, 
    vibe, 
    location, 
    updated_at, 
    expires_at
  )
  values (
    auth.uid(), 
    p_vibe::vibe_enum,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geometry,
    now(),
    now() + interval '2 minutes'
  )
  on conflict (profile_id)
  do update
     set vibe       = excluded.vibe,
         location   = excluded.location,
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at;
END;
$$;

-- Update get_active_floqs_with_members function
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_user_lat double precision DEFAULT NULL,
  p_user_lng double precision DEFAULT NULL,
  p_flock_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  name text,
  description text,
  primary_vibe vibe_enum,
  vibe_tag text,
  type text,
  flock_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  participant_count integer,
  boost_count integer,
  starts_in_min integer,
  distance_meters double precision,
  members jsonb,
  creator_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _now timestamptz := now();
  _limit integer := LEAST(GREATEST(p_limit, 1), 100);  -- Clamp between 1-100 (mobile payload)
BEGIN
  RETURN QUERY
  WITH visible_floqs AS (
    SELECT
      f.id,
      f.title,
      f.name,
      f.description,
      f.primary_vibe,
      f.primary_vibe AS vibe_tag,
      COALESCE(f.type, 'auto') AS type,
      f.flock_type,
      f.starts_at,
      f.ends_at,
      f.creator_id,
      CASE 
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
        THEN ST_Distance(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
        )::double precision
        ELSE NULL::double precision
      END AS distance_meters
    FROM public.floqs f
    WHERE f.ends_at > _now
      AND f.visibility = 'public'
      AND f.deleted_at IS NULL
      -- Syntax optimization: use COALESCE instead of branching
      AND COALESCE(p_flock_type, f.flock_type, f.flock_type) = f.flock_type
      AND NOT EXISTS (
        SELECT 1
        FROM public.floq_ignored fi
        WHERE fi.floq_id = f.id
          AND fi.profile_id = auth.uid()
      )
  )
  SELECT
    fwd.id,
    fwd.title,
    fwd.name,
    fwd.description,
    fwd.primary_vibe,
    fwd.vibe_tag,
    fwd.type,
    fwd.flock_type,
    fwd.starts_at,
    fwd.ends_at,
    COALESCE(participants.participant_count, 0) AS participant_count,
    COALESCE(boosts.boost_count, 0) AS boost_count,
    GREATEST(0, EXTRACT(EPOCH FROM (fwd.starts_at - _now))/60)::int AS starts_in_min,
    fwd.distance_meters,
    COALESCE(members.members, '[]'::jsonb) AS members,
    fwd.creator_id
  FROM visible_floqs fwd
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = fwd.id
  ) participants ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS boost_count
    FROM public.floq_boosts fb
    WHERE fb.floq_id = fwd.id 
    AND fb.boost_type = 'vibe'
    AND fb.expires_at > _now
  ) boosts ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'avatar_url', p.avatar_url,
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name
    ) ORDER BY fp.joined_at DESC) AS members
    FROM public.floq_participants fp
    JOIN public.profiles p ON p.id = fp.profile_id
    WHERE fp.floq_id = fwd.id
    LIMIT 8
  ) members ON TRUE
  ORDER BY 
    fwd.distance_meters NULLS LAST,
    boosts.boost_count DESC,
    fwd.starts_at
  LIMIT _limit OFFSET p_offset;
END;
$$;

-- Update search_floqs function
CREATE OR REPLACE FUNCTION public.search_floqs(
  p_query text DEFAULT '',
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT 50,
  p_time_from timestamptz DEFAULT now(),
  p_time_to timestamptz DEFAULT now() + interval '7 days',
  p_visibilities text[] DEFAULT ARRAY['public'],
  p_vibe_ids vibe_enum[] DEFAULT ARRAY[]::vibe_enum[],
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  title text,
  primary_vibe vibe_enum,
  starts_at timestamptz,
  ends_at timestamptz,
  distance_m double precision,
  participant_count integer,
  friends_going_count integer,
  friends_going_avatars text[],
  friends_going_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _viewer_id uuid := auth.uid();
BEGIN
  -- Early exit for guest users (no friend data needed)
  IF _viewer_id IS NULL THEN
    RETURN QUERY
    WITH base_floqs AS (
      SELECT 
        f.id,
        f.title,
        f.primary_vibe,
        f.starts_at,
        f.ends_at,
        ST_Distance(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance_m
      FROM public.floqs f
      WHERE f.visibility = ANY(p_visibilities)
        AND f.deleted_at IS NULL
        AND ST_DWithin(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_km * 1000
        )
        -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
        AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
        AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
        -- Time window overlap logic
        AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
        AND f.starts_at <= p_time_to
    )
    SELECT 
      b.id,
      b.title,
      b.primary_vibe,
      b.starts_at,
      b.ends_at,
      b.distance_m,
      COALESCE(pc.participant_count, 0) AS participant_count,
      0 AS friends_going_count,
      ARRAY[]::text[] AS friends_going_avatars,
      ARRAY[]::text[] AS friends_going_names
    FROM base_floqs b
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = b.id
    ) pc ON true
    ORDER BY b.distance_m, pc.participant_count DESC, b.starts_at
    LIMIT p_limit;
    
    RETURN;
  END IF;

  -- Main query for authenticated users with friend data
  RETURN QUERY
  WITH base_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.primary_vibe,
      f.starts_at,
      f.ends_at,
      ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS distance_m
    FROM public.floqs f
    WHERE f.visibility = ANY(p_visibilities)
      AND f.deleted_at IS NULL
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
      AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
      -- Time window overlap logic
      AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
      AND f.starts_at <= p_time_to
  ),
  friends AS (
    SELECT CASE WHEN f.profile_id = _viewer_id THEN f.friend_id ELSE f.profile_id END AS profile_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (_viewer_id IN (f.profile_id, f.friend_id))
  ),
  joined AS (
    SELECT 
      b.id AS floq_id,
      COUNT(fp.profile_id)::int AS cnt,
      (array_agg(p.avatar_url ORDER BY fp.joined_at DESC) FILTER (WHERE p.avatar_url IS NOT NULL))[1:4] AS avatars,
      (array_agg(p.display_name ORDER BY fp.joined_at DESC))[1:4] AS names
    FROM base_floqs b
    JOIN public.floq_participants fp ON fp.floq_id = b.id
    JOIN friends f ON f.profile_id = fp.profile_id
    JOIN public.profiles p ON p.id = fp.profile_id
    GROUP BY b.id
  )
  SELECT 
    b.id,
    b.title,
    b.primary_vibe,
    b.starts_at,
    b.ends_at,
    b.distance_m,
    COALESCE(pc.participant_count, 0) AS participant_count,
    COALESCE(j.cnt, 0) AS friends_going_count,
    COALESCE(j.avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(j.names, ARRAY[]::text[]) AS friends_going_names
  FROM base_floqs b
  LEFT JOIN joined j ON j.floq_id = b.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = b.id
  ) pc ON true
  ORDER BY b.distance_m, COALESCE(j.cnt, 0) DESC, pc.participant_count DESC
  LIMIT p_limit;
END;
$$;

-- Update search_users function
CREATE OR REPLACE FUNCTION public.search_users(search_query text)
RETURNS TABLE(
  id uuid,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.display_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE length(trim(search_query)) >= 2
    AND lower(p.display_name) ILIKE '%' || lower(trim(search_query)) || '%'
    AND p.id <> auth.uid()
    AND p.display_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE (f.profile_id = auth.uid() AND f.friend_id = p.id)
         OR (f.friend_id = auth.uid() AND f.profile_id = p.id)
    )
  ORDER BY 
    -- Exact matches first, then prefix matches, then contains
    CASE 
      WHEN lower(p.display_name) = lower(trim(search_query)) THEN 1
      WHEN lower(p.display_name) ILIKE lower(trim(search_query)) || '%' THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 20;
END;
$$;

-- Update reorder_plan_stops function
CREATE OR REPLACE FUNCTION public.reorder_plan_stops(
  p_plan_id uuid,
  p_stop_orders jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Access check: participant or floq member
  IF NOT EXISTS (
      SELECT 1 FROM public.plan_participants
      WHERE plan_id = p_plan_id AND profile_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.floq_plans fp
      JOIN public.floq_participants fpar
        ON fpar.floq_id = fp.floq_id
      WHERE fp.id = p_plan_id
        AND fpar.profile_id = auth.uid()
    )
  THEN
    RAISE EXCEPTION 'Access denied to plan %', p_plan_id;
  END IF;

  -- Bulk update
  UPDATE public.plan_stops ps
  SET    stop_order = v.stop_order
  FROM (
    SELECT (elem->>'id')::uuid        AS id,
           (elem->>'stop_order')::int AS stop_order
    FROM   jsonb_array_elements(p_stop_orders) elem
  ) v
  WHERE ps.id = v.id
    AND ps.plan_id = p_plan_id;

  -- Touch plan.updated_at
  UPDATE public.floq_plans
  SET    updated_at = now()
  WHERE  id = p_plan_id;
END;
$$;

-- Update update_last_read_at function
CREATE OR REPLACE FUNCTION public.update_last_read_at(
  thread_id_param uuid,
  user_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.direct_threads
  SET 
    last_read_at_a = CASE WHEN member_a = user_id_param THEN now() ELSE last_read_at_a END,
    last_read_at_b = CASE WHEN member_b = user_id_param THEN now() ELSE last_read_at_b END
  WHERE id = thread_id_param
    AND (member_a = user_id_param OR member_b = user_id_param);
  
  -- Notify UI to invalidate unread counts cache
  PERFORM pg_notify('dm_read_status', json_build_object(
    'thread_id', thread_id_param,
    'profile_id', user_id_param
  )::text);
END;
$$;

-- Log completion of batch operation
DO $$
BEGIN
    RAISE NOTICE 'Completed batch function updates at %', now();
END $$;

-- Commit the transaction
COMMIT;

-- Reset timeout to default
SET statement_timeout = DEFAULT;

-- Verification query (run after the transaction)
-- SELECT 
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name = 'user_id'; 