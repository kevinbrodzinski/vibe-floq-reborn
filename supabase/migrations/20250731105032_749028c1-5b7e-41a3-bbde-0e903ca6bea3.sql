-- Fix search_floqs function with correct parameter types and table references

/* ────────────────────────────────────────────────────────────────────────────
   Drop all existing search_floqs function overloads
──────────────────────────────────────────────────────────────────────────── */
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'search_floqs'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.search_floqs(%s);',
      r.args
    );
  END LOOP;
END$$;

/* ────────────────────────────────────────────────────────────────────────────
   Create the corrected search_floqs function
──────────────────────────────────────────────────────────────────────────── */
CREATE FUNCTION public.search_floqs(
  p_lat          DOUBLE PRECISION,
  p_lng          DOUBLE PRECISION,
  p_radius_km    DOUBLE PRECISION DEFAULT 25,
  p_query        TEXT             DEFAULT NULL,
  p_vibe_ids     TEXT[]           DEFAULT NULL,
  p_time_from    TIMESTAMPTZ      DEFAULT NULL,
  p_time_to      TIMESTAMPTZ      DEFAULT NULL,
  p_limit        INTEGER          DEFAULT 200
)
RETURNS TABLE (
  id                     UUID,
  title                  TEXT,
  description            TEXT,
  primary_vibe           TEXT,
  starts_at              TIMESTAMPTZ,
  ends_at                TIMESTAMPTZ,
  distance_m             INTEGER,
  participant_count      INTEGER,
  creator_id             UUID,
  creator_username       TEXT,
  creator_display_name   TEXT,
  creator_avatar_url     TEXT,
  user_joined_floq_id    UUID,
  friends_going_count    INTEGER,
  friends_going_avatars  TEXT[],
  friends_going_names    TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  viewer_id UUID := auth.uid();
  search_point GEOGRAPHY;
BEGIN
  -- Create the search point
  search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  RETURN QUERY
  WITH base_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.description,
      f.primary_vibe::text,
      f.starts_at,
      f.ends_at,
      ST_Distance(f.location::geography, search_point)::integer AS distance_m,
      f.creator_id
    FROM floqs f
    WHERE 
      -- Active floqs only
      (f.ends_at IS NULL OR f.ends_at > NOW())
      AND f.deleted_at IS NULL
      
      -- Within radius
      AND ST_DWithin(f.location::geography, search_point, p_radius_km * 1000)
      
      -- Visibility check
      AND (
        f.visibility = 'public'
        OR f.creator_id = viewer_id
        OR EXISTS (
          SELECT 1 FROM floq_participants fp 
          WHERE fp.floq_id = f.id AND fp.profile_id = viewer_id
        )
      )
      
      -- Text search (if provided)
      AND (
        p_query IS NULL 
        OR f.title ILIKE '%' || p_query || '%'
        OR f.description ILIKE '%' || p_query || '%'
      )
      
      -- Vibe filter (if provided)
      AND (
        p_vibe_ids IS NULL 
        OR f.primary_vibe::text = ANY(p_vibe_ids)
      )
      
      -- Time range filter (if provided)
      AND (
        p_time_from IS NULL OR f.starts_at >= p_time_from
      )
      AND (
        p_time_to IS NULL OR f.starts_at <= p_time_to
      )
  ),
  
  floq_participants_agg AS (
    SELECT 
      fp.floq_id,
      COUNT(*)::integer AS participant_count
    FROM floq_participants fp
    WHERE fp.floq_id IN (SELECT bf.id FROM base_floqs bf)
    GROUP BY fp.floq_id
  ),
  
  creator_info AS (
    SELECT 
      p.id,
      p.username,
      p.display_name,
      p.avatar_url
    FROM profiles p
    WHERE p.id IN (SELECT bf.creator_id FROM base_floqs bf)
  ),
  
  user_participation AS (
    SELECT 
      fp.floq_id,
      fp.floq_id AS user_joined_floq_id
    FROM floq_participants fp
    WHERE fp.profile_id = viewer_id
      AND fp.floq_id IN (SELECT bf.id FROM base_floqs bf)
  ),
  
  friends_going AS (
    SELECT 
      fp.floq_id,
      COUNT(*)::integer AS friends_going_count,
      array_agg(p.avatar_url ORDER BY p.display_name) AS friends_going_avatars,
      array_agg(p.display_name ORDER BY p.display_name) AS friends_going_names
    FROM floq_participants fp
    JOIN profiles p ON p.id = fp.profile_id
    WHERE fp.floq_id IN (SELECT bf.id FROM base_floqs bf)
      AND viewer_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM friends f 
        WHERE (f.profile_id = viewer_id AND f.friend_id = fp.profile_id)
           OR (f.friend_id = viewer_id AND f.profile_id = fp.profile_id)
      )
    GROUP BY fp.floq_id
  )
  
  SELECT 
    bf.id,
    bf.title,
    bf.description,
    bf.primary_vibe,
    bf.starts_at,
    bf.ends_at,
    bf.distance_m,
    COALESCE(fpa.participant_count, 0) AS participant_count,
    bf.creator_id,
    ci.username AS creator_username,
    ci.display_name AS creator_display_name,
    ci.avatar_url AS creator_avatar_url,
    up.user_joined_floq_id,
    COALESCE(fg.friends_going_count, 0) AS friends_going_count,
    COALESCE(fg.friends_going_avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(fg.friends_going_names, ARRAY[]::text[]) AS friends_going_names
  FROM base_floqs bf
  LEFT JOIN floq_participants_agg fpa ON fpa.floq_id = bf.id
  LEFT JOIN creator_info ci ON ci.id = bf.creator_id
  LEFT JOIN user_participation up ON up.floq_id = bf.id
  LEFT JOIN friends_going fg ON fg.floq_id = bf.id
  ORDER BY bf.distance_m ASC, bf.starts_at ASC
  LIMIT p_limit;
END;
$function$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.search_floqs TO anon, authenticated;