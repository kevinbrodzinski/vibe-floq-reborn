-- 1️⃣ drop old
DROP FUNCTION IF EXISTS public.create_floq(
  double precision, double precision, timestamptz, timestamptz,
  vibe_enum, text, text, vibe_enum[], text
);

-- 2️⃣ profile-only version (excerpt)
CREATE FUNCTION public.create_floq(
  p_lat            DOUBLE PRECISION,
  p_lng            DOUBLE PRECISION,
  p_starts_at      TIMESTAMPTZ,
  p_ends_at        TIMESTAMPTZ,
  p_vibe           vibe_enum,
  p_visibility     TEXT,
  p_title          TEXT,
  p_invitees       UUID[],
  p_flock_type     TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  new_id      UUID;
  creator_id  UUID := auth.uid();
  computed_ends_at timestamptz;
BEGIN
  -- … validations stay the same …

  INSERT INTO floqs (
    id, creator_id, location, starts_at, ends_at,
    primary_vibe, visibility, title, flock_type)
  VALUES (
    gen_random_uuid(),
    creator_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326)::geometry,
    p_starts_at,
    computed_ends_at,
    p_vibe,
    p_visibility,
    COALESCE(NULLIF(p_title,''),'Untitled'),
    p_flock_type)
  RETURNING id INTO new_id;

  INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', now())
  ON CONFLICT (floq_id, profile_id) DO NOTHING;

  IF array_length(p_invitees,1) > 0 THEN
    INSERT INTO floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_id, unnest(p_invitees), 'pending'
    ON CONFLICT (floq_id, invitee_id) DO NOTHING;
  END IF;

  INSERT INTO flock_history (floq_id, profile_id, event_type, metadata)
  VALUES (
    new_id,
    creator_id,
    'created',
    jsonb_build_object(
      'flock_type', p_flock_type,
      'visibility', p_visibility,
      'has_end_date', computed_ends_at IS NOT NULL));

  PERFORM pg_notify(
    'floqs_channel',
    json_build_object(
      'event','floq_created',
      'floq_id', new_id,
      'creator_id', creator_id)::text);

  RETURN new_id;
END;
$$;

DO $$
DECLARE
    func_name TEXT;
    rec       RECORD;
BEGIN
    FOREACH func_name IN ARRAY ARRAY[
        'create_floq',
        'friends_nearby',
        'get_floq_participants',
        'presence_nearby',
        'reorder_plan_stops',
        'log_presence_if_needed'
    ]
    LOOP
        FOR rec IN
            SELECT pg_get_function_identity_arguments(p.oid) AS args
            FROM   pg_proc p
            JOIN   pg_namespace n ON n.oid = p.pronamespace
            WHERE  n.nspname = 'public'
              AND  p.proname = func_name
        LOOP
            EXECUTE format(
                'DROP FUNCTION IF EXISTS public.%I(%s);',
                func_name,
                rec.args
            );
        END LOOP;
    END LOOP;
END $$;

/****************************************************************************************
* 2025-08-06 | Purge user_id from remaining PL/pgSQL functions
****************************************************************************************/
BEGIN;

----------------------------------------------------------------------------------------
-- 1. create_floq
----------------------------------------------------------------------------------------
CREATE FUNCTION public.create_floq(
  p_lat            DOUBLE PRECISION,
  p_lng            DOUBLE PRECISION,
  p_starts_at      TIMESTAMPTZ,
  p_ends_at        TIMESTAMPTZ,
  p_vibe           vibe_enum,
  p_visibility     TEXT,
  p_title          TEXT,
  p_invitees       UUID[],
  p_flock_type     TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  new_id      UUID;
  creator_id  UUID := auth.uid();
  computed_ends_at TIMESTAMPTZ;
BEGIN
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- (validations unchanged …)

  INSERT INTO public.floqs (
    id, creator_id, location, starts_at, ends_at,
    primary_vibe, visibility, title, flock_type
  ) VALUES (
    gen_random_uuid(),
    creator_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326)::geometry,
    p_starts_at,
    computed_ends_at,
    p_vibe,
    p_visibility,
    COALESCE(NULLIF(p_title,''),'Untitled'),
    p_flock_type
  ) RETURNING id INTO new_id;

  INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_id, creator_id, 'creator', NOW())
  ON CONFLICT (floq_id, profile_id) DO NOTHING;

  IF array_length(p_invitees,1) > 0 THEN
    INSERT INTO public.floq_invitations (floq_id, inviter_id, invitee_id, status)
    SELECT new_id, creator_id, unnest(p_invitees), 'pending'
    ON CONFLICT (floq_id, invitee_id) DO NOTHING;
  END IF;

  INSERT INTO public.flock_history (floq_id, profile_id, event_type, metadata)
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

  PERFORM pg_notify(
    'floqs_channel',
    json_build_object(
      'event','floq_created',
      'floq_id', new_id,
      'creator_id', creator_id
    )::text
  );

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_floq TO anon, authenticated;

----------------------------------------------------------------------------------------
-- 2. friends_nearby(lat, lng, radius_km)
----------------------------------------------------------------------------------------
CREATE FUNCTION public.friends_nearby(
  user_lat  DOUBLE PRECISION,
  user_lng  DOUBLE PRECISION,
  radius_km NUMERIC
) RETURNS TABLE (
  profile_id    UUID,
  display_name  TEXT,
  avatar_url    TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  distance_m    NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
AS $$
WITH my_friends AS (
  SELECT CASE
           WHEN f.profile_id = auth.uid() THEN f.friend_id
           ELSE f.profile_id
         END AS friend_id
  FROM public.friendships f
  WHERE f.profile_id = auth.uid() OR f.friend_id = auth.uid()
),
friend_presence AS (
  SELECT DISTINCT ON (v.profile_id)
         v.profile_id,
         v.geo,
         ST_Y(v.location::geometry) AS lat,
         ST_X(v.location::geometry) AS lng,
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
  ) AS distance_m
FROM friend_presence fp
JOIN public.profiles p ON p.id = fp.profile_id
WHERE ST_DWithin(
        fp.geo,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat),4326)::geography,
        radius_km * 1000
      )
ORDER BY distance_m
LIMIT 50;
$$;

----------------------------------------------------------------------------------------
-- 3. get_floq_participants
----------------------------------------------------------------------------------------

CREATE FUNCTION public.get_floq_participants(
  p_floq_id UUID,
  p_limit   INTEGER DEFAULT 6
) RETURNS TABLE (
  profile_id  UUID,
  avatar_url  TEXT
)
LANGUAGE sql
SECURITY INVOKER
AS $$
WITH params AS (
  SELECT LEAST(COALESCE(p_limit,6),12)::int AS max_rows
)
SELECT
  fp.profile_id,
  pr.avatar_url
FROM public.floq_participants fp
JOIN public.profiles pr ON pr.id = fp.profile_id
JOIN public.floqs    f  ON f.id  = fp.floq_id
WHERE fp.floq_id = p_floq_id
  AND f.visibility = 'public'
LIMIT (SELECT max_rows FROM params);
$$;

----------------------------------------------------------------------------------------
-- 4. presence_nearby
----------------------------------------------------------------------------------------

CREATE FUNCTION public.presence_nearby(
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  km           NUMERIC,
  include_self BOOLEAN DEFAULT FALSE
) RETURNS SETOF public.vibes_now
LANGUAGE sql
SECURITY INVOKER
AS $$
SELECT *
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
               WHERE (f.profile_id = auth.uid() AND f.friend_id = v.profile_id)
                  OR (f.friend_id = auth.uid() AND f.profile_id = v.profile_id)
             )
        )
      );
$$;

----------------------------------------------------------------------------------------
-- 5. reorder_plan_stops
----------------------------------------------------------------------------------------

CREATE FUNCTION public.reorder_plan_stops(
  p_plan_id     UUID,
  p_stop_orders JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Access check
  IF NOT EXISTS (
        SELECT 1
        FROM public.plan_participants
        WHERE plan_id = p_plan_id
          AND profile_id = auth.uid()
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

  UPDATE public.floq_plans
  SET    updated_at = NOW()
  WHERE  id = p_plan_id;
END;
$$;

----------------------------------------------------------------------------------------
-- 6. log_presence_if_needed (trigger)
----------------------------------------------------------------------------------------
CREATE FUNCTION public.log_presence_if_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  _geo geography := geography(ST_MakePoint(ST_X(NEW.location), ST_Y(NEW.location)));
BEGIN
  IF public.should_log_presence(NEW.profile_id, _geo) THEN
    INSERT INTO public.vibes_log (profile_id, ts, location, venue_id, vibe)
    VALUES (NEW.profile_id, NEW.updated_at, _geo, NEW.venue_id, NEW.vibe);
  END IF;
  RETURN NULL; -- AFTER trigger
END;
$$;


----------------------------------------------------------------------------------------
COMMIT;

/****************************************************************************************
* 2025-08-06 | Purge user_id from get_active_floqs_with_members
****************************************************************************************/
BEGIN;

----------------------------------------------------------------------------------------
-- 1. Loop-drop every existing overload
----------------------------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT pg_get_function_identity_arguments(p.oid) AS args
        FROM   pg_proc p
        JOIN   pg_namespace n ON n.oid = p.pronamespace
        WHERE  n.nspname = 'public'
          AND  p.proname = 'get_active_floqs_with_members'
    LOOP
        EXECUTE format(
            'DROP FUNCTION IF EXISTS public.get_active_floqs_with_members(%s);',
            rec.args
        );
    END LOOP;
END $$;

----------------------------------------------------------------------------------------
-- 2. Recreate canonical profile_id version
----------------------------------------------------------------------------------------
CREATE FUNCTION public.get_active_floqs_with_members(
  p_limit       INTEGER           DEFAULT 20,
  p_offset      INTEGER           DEFAULT 0,
  p_user_lat    DOUBLE PRECISION  DEFAULT NULL,
  p_user_lng    DOUBLE PRECISION  DEFAULT NULL,
  p_flock_type  TEXT              DEFAULT NULL
) RETURNS TABLE (
  id                UUID,
  title             TEXT,
  name              TEXT,
  description       TEXT,
  primary_vibe      vibe_enum,
  vibe_tag          vibe_enum,
  type              TEXT,
  flock_type        TEXT,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  participant_count INTEGER,
  boost_count       INTEGER,
  starts_in_min     INTEGER,
  distance_meters   NUMERIC,
  members           JSONB,
  creator_id        UUID
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  _now   TIMESTAMPTZ := NOW();
  _limit INTEGER      := LEAST(GREATEST(p_limit, 1), 100);  -- clamp 1-100
BEGIN
  RETURN QUERY
  WITH visible_floqs AS (
    SELECT
      f.id, f.title, f.name, f.description,
      f.primary_vibe, f.primary_vibe                 AS vibe_tag,
      COALESCE(f.type, 'auto')                       AS type,
      f.flock_type,
      f.starts_at, f.ends_at,
      f.creator_id,
      CASE
        WHEN p_user_lat IS NOT NULL
         AND p_user_lng IS NOT NULL
        THEN ST_Distance(
               f.location::geography,
               ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
             )::NUMERIC
        ELSE NULL
      END                                            AS distance_meters
    FROM public.floqs f
    WHERE f.ends_at   > _now
      AND f.visibility = 'public'
      AND f.deleted_at IS NULL
      AND COALESCE(p_flock_type, f.flock_type, f.flock_type) = f.flock_type
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
    COALESCE(boosts.boost_count, 0)             AS boost_count,
    GREATEST(0,
      EXTRACT(EPOCH FROM (fwd.starts_at - _now)) / 60
    )::INT                                      AS starts_in_min,
    fwd.distance_meters,
    COALESCE(members.members, '[]'::JSONB)      AS members,
    fwd.creator_id
  FROM visible_floqs fwd
  /* participant count */
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = fwd.id
  ) participants ON TRUE
  /* vibe boosts */
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS boost_count
    FROM public.floq_boosts fb
    WHERE fb.floq_id   = fwd.id
      AND fb.boost_type = 'vibe'
      AND fb.expires_at > _now
  ) boosts ON TRUE
  /* up to 8 member avatars */
  LEFT JOIN LATERAL (
    SELECT JSONB_AGG(
             JSONB_BUILD_OBJECT(
               'avatar_url', p.avatar_url,
               'id',         p.id,
               'username',   p.username,
               'display_name', p.display_name
             ) ORDER BY fp.joined_at DESC
           ) AS members
    FROM public.floq_participants fp
    JOIN public.profiles p
      ON p.id = fp.profile_id
    WHERE fp.floq_id = fwd.id
    LIMIT 8
  ) members ON TRUE
  ORDER BY
    COALESCE(fwd.distance_meters, 1e9),
    boosts.boost_count DESC,
    fwd.starts_at
  LIMIT _limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_floqs_with_members(
  INTEGER, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, TEXT
) TO anon, authenticated;

COMMIT;

/****************************************************************************************
* 2025-08-08 | Profile-only rewrite of public.search_floqs
****************************************************************************************/
BEGIN;

----------------------------------------------------------------------------------------
-- 1. Drop every existing overload of search_floqs
----------------------------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT pg_get_function_identity_arguments(p.oid) AS args
        FROM   pg_proc p
        JOIN   pg_namespace n ON n.oid = p.pronamespace
        WHERE  n.nspname = 'public'
          AND  p.proname = 'search_floqs'
    LOOP
        EXECUTE format(
            'DROP FUNCTION IF EXISTS public.search_floqs(%s);',
            rec.args
        );
    END LOOP;
END $$;

----------------------------------------------------------------------------------------
-- 2. Re-create canonical profile-id version
----------------------------------------------------------------------------------------
CREATE FUNCTION public.search_floqs(
  p_lat          DOUBLE PRECISION,
  p_lng          DOUBLE PRECISION,
  p_radius_km    NUMERIC,
  p_vibe_ids     vibe_enum[]     DEFAULT '{}',
  p_query        TEXT            DEFAULT '',
  p_time_from    TIMESTAMPTZ     DEFAULT NULL,
  p_time_to      TIMESTAMPTZ     DEFAULT NULL,
  p_visibilities TEXT[]          DEFAULT ARRAY['public'],
  p_limit        INTEGER         DEFAULT 20
) RETURNS TABLE (
  id                       UUID,
  title                    TEXT,
  primary_vibe             vibe_enum,
  starts_at                TIMESTAMPTZ,
  ends_at                  TIMESTAMPTZ,
  distance_m               NUMERIC,
  participant_count        INTEGER,
  friends_going_count      INTEGER,
  friends_going_avatars    TEXT[],
  friends_going_names      TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  _viewer_id UUID := auth.uid();
BEGIN
  /* =========================================================================
   * GUEST USERS  (no friend data, no auth.uid)
   * ========================================================================= */
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
      WHERE f.visibility              = ANY (p_visibilities)
        AND f.deleted_at              IS NULL
        AND ST_DWithin(
              f.location::geography,
              ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
              p_radius_km * 1000
            )
        AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY (p_vibe_ids))
        AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
        AND (p_time_from IS NULL OR COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from)
        AND (p_time_to   IS NULL OR f.starts_at <= p_time_to)
    )
    SELECT
      b.id,
      b.title,
      b.primary_vibe,
      b.starts_at,
      b.ends_at,
      b.distance_m,
      COALESCE(pc.participant_count, 0) AS participant_count,
      0                                 AS friends_going_count,
      ARRAY[]::text[]                   AS friends_going_avatars,
      ARRAY[]::text[]                   AS friends_going_names
    FROM base_floqs b
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = b.id
    ) pc ON TRUE
    ORDER BY
      b.distance_m,
      pc.participant_count DESC,
      b.starts_at
    LIMIT p_limit;

    RETURN;  -- guest path done
  END IF;

  /* =========================================================================
   * AUTHENTICATED USERS  (include friend context)
   * ========================================================================= */
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
      WHERE f.visibility              = ANY (p_visibilities)
        AND f.deleted_at              IS NULL
        AND ST_DWithin(
              f.location::geography,
              ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
              p_radius_km * 1000
            )
        AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY (p_vibe_ids))
        AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
        AND (p_time_from IS NULL OR COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from)
        AND (p_time_to   IS NULL OR f.starts_at <= p_time_to)
  ),
  friends AS (
      SELECT
        CASE
          WHEN fr.profile_id = _viewer_id THEN fr.friend_id
          ELSE fr.profile_id
        END AS friend_profile_id
      FROM public.friends fr
      WHERE fr.status = 'accepted'
        AND _viewer_id IN (fr.profile_id, fr.friend_id)
  ),
  joined AS (
      SELECT
        b.id                                    AS floq_id,
        COUNT(fp.profile_id)::int               AS cnt,
        (array_agg(p.avatar_url ORDER BY fp.joined_at DESC)
           FILTER (WHERE p.avatar_url IS NOT NULL))[1:4] AS avatars,
        (array_agg(p.display_name ORDER BY fp.joined_at DESC))[1:4]        AS names
      FROM base_floqs           b
      JOIN public.floq_participants fp ON fp.floq_id = b.id
      JOIN friends f                      ON f.friend_profile_id = fp.profile_id
      JOIN public.profiles p              ON p.id = fp.profile_id
      GROUP BY b.id
  )
  SELECT
    b.id,
    b.title,
    b.primary_vibe,
    b.starts_at,
    b.ends_at,
    b.distance_m,
    COALESCE(pc.participant_count, 0)  AS participant_count,
    COALESCE(j.cnt, 0)                 AS friends_going_count,
    COALESCE(j.avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(j.names,   ARRAY[]::text[]) AS friends_going_names
  FROM base_floqs b
  LEFT JOIN joined j ON j.floq_id = b.id
  LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = b.id
  ) pc ON TRUE
  ORDER BY
    b.distance_m,
    COALESCE(j.cnt, 0) DESC,
    pc.participant_count DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_floqs(
  double precision, double precision, numeric,
  vibe_enum[], text, timestamptz, timestamptz,
  text[], integer
) TO anon, authenticated;

COMMIT;

/****************************************************************************************
* 2025-08-08 | Profile-only rewrite of public.search_users
****************************************************************************************/
BEGIN;

----------------------------------------------------------------------------------------
-- 1. Drop every existing overload of search_users
----------------------------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT pg_get_function_identity_arguments(p.oid) AS args
        FROM   pg_proc p
        JOIN   pg_namespace n ON n.oid = p.pronamespace
        WHERE  n.nspname = 'public'
          AND  p.proname = 'search_users'
    LOOP
        EXECUTE format(
            'DROP FUNCTION IF EXISTS public.search_users(%s);',
            rec.args
        );
    END LOOP;
END $$;

----------------------------------------------------------------------------------------
-- 2. Re-create canonical profile-id version
----------------------------------------------------------------------------------------
CREATE FUNCTION public.search_users(
  search_query TEXT
) RETURNS TABLE (
  id            UUID,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE LENGTH(TRIM(search_query)) >= 2
    AND lower(p.display_name) ILIKE '%' || lower(TRIM(search_query)) || '%'
    AND p.id <> auth.uid()
    AND p.display_name IS NOT NULL
    AND NOT EXISTS (
          SELECT 1
          FROM public.friendships f
          WHERE (f.profile_id = auth.uid() AND f.friend_id = p.id)
             OR (f.friend_id  = auth.uid() AND f.profile_id = p.id)
    )
  ORDER BY
    CASE
      WHEN lower(p.display_name) = lower(TRIM(search_query))            THEN 1
      WHEN lower(p.display_name) ILIKE lower(TRIM(search_query)) || '%' THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_users(text) TO anon, authenticated;

COMMIT;