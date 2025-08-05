-- Comprehensive Migration Script with All Dependencies
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- WARNING: This script will drop and recreate dependent objects
-- Make sure to backup your database first

-- Step 1: Drop dependent materialized views first
DROP MATERIALIZED VIEW IF EXISTS public.v_friend_sparkline CASCADE;

-- Step 2: Drop dependent regular views
DROP VIEW IF EXISTS public.v_active_users CASCADE;

-- Step 3: Drop user_id from vibes_now table
ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS user_id;

-- Step 4: Recreate the v_active_users view with correct structure
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT 
  profile_id,  -- Changed from user_id to profile_id
  st_y((location)::geometry) AS lat,
  st_x((location)::geometry) AS lng,
  vibe,
  updated_at
FROM vibes_now vn
WHERE (expires_at > now()) AND (visibility = 'public'::text);

-- Step 5: Drop user_id from all other tables
ALTER TABLE public.achievements DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.afterglow_collections DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.afterglow_favorites DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.app_user_notification DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.daily_afterglow DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.daily_recap_cache DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.event_notifications DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.flock_auto_suggestions DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.flock_history DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_activity DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_afterglow DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_boosts DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_ignored DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_mention_cooldown DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_message_reactions DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_last_points DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_requests DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_share_pref DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_trails DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friendships DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.notification_queue DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_activities DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_afterglow DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_comments DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_drafts DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_feedback DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_invites DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_participants DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_stop_comments DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_stop_votes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_votes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_202507 DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_202508 DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_202509 DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_staging DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.snap_suggestion_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_action_log DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_favorites DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_floq_activity_tracking DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_notifications DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_onboarding_progress DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_push_tokens DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_vibe_states DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_watchlist DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_feed_posts DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_live_presence DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_stays DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_visits DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venues_near_me DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.vibes_log DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.weekly_ai_suggestion_cooldowns DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.weekly_ai_suggestions DROP COLUMN IF EXISTS user_id;

-- Step 6: Update functions that reference user_id
-- Note: These functions need to be updated to use profile_id instead of user_id

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
  profile_id uuid,
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
                 WHERE (f.profile_id   = auth.uid() AND f.friend_id = v.profile_id)
                    OR (f.friend_id = auth.uid() AND f.profile_id   = v.profile_id)
               )
          )
        );
END;
$$;

-- Update should_log_presence function
CREATE OR REPLACE FUNCTION public.should_log_presence(
  p_profile profile_id,
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

-- Step 7: Verify all user_id columns have been removed
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- Step 8: Check for any remaining references to user_id in functions
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%user_id%'
ORDER BY routine_name; 