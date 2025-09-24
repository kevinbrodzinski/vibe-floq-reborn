/* ──────────────────────────────────────────────
   1.  Remove any stray overloads (exact list)
   ────────────────────────────────────────────── */
DROP FUNCTION IF EXISTS public.people_crossed_paths_today(uuid, integer);
DROP FUNCTION IF EXISTS public.people_crossed_paths_today(uuid, numeric);

/* ──────────────────────────────────────────────
   2.  Canonical implementation
   ────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.people_crossed_paths_today (
  in_me            uuid,
  proximity_meters integer DEFAULT 25          -- ≤ 25 m "bubble"
)
RETURNS TABLE (
  profile_id               uuid,
  username                 text,
  display_name             text,
  avatar_url               text,
  last_seen_at             timestamptz,
  distance_meters          integer,
  overlap_duration_minutes integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_start CONSTANT timestamptz := date_trunc('day', now());
  day_end   CONSTANT timestamptz := day_start + INTERVAL '1 day';
BEGIN
  IF in_me IS NULL THEN                      -- safety-net for SQL callers
    RAISE EXCEPTION 'in_me must not be NULL';
  END IF;

  RETURN QUERY
  WITH my AS (
    SELECT location::geometry  AS geom,
           updated_at
      FROM vibes_now
     WHERE profile_id = in_me
       AND updated_at >= day_start
       AND updated_at <  day_end
  ),
  others AS (
    SELECT vn.profile_id,
           vn.location::geometry     AS geom,
           vn.updated_at,
           p.username,
           p.display_name,
           p.avatar_url
      FROM vibes_now  vn
      JOIN profiles   p  ON p.id = vn.profile_id
     WHERE vn.profile_id <> in_me
       AND vn.updated_at BETWEEN day_start AND day_end

       /* ─── Exclude accepted friends ─── */
       AND NOT EXISTS (
             SELECT 1
               FROM friendships f
              WHERE f.friend_state = 'accepted'
                AND (
                     (f.user_low  = in_me AND f.user_high = vn.profile_id) OR
                     (f.user_high = in_me AND f.user_low  = vn.profile_id)
                    )
           )

       /* ─── Exclude pending requests (both directions) ─── */
       AND NOT EXISTS (
             SELECT 1
               FROM friend_requests fr
              WHERE fr.status = 'pending'
                AND (
                     (fr.profile_id       = in_me AND fr.other_profile_id = vn.profile_id) OR
                     (fr.other_profile_id = in_me AND fr.profile_id       = vn.profile_id)
                    )
           )
  ),
  proximity AS (
    SELECT
      o.profile_id,
      o.username,
      o.display_name,
      o.avatar_url,
      MAX(o.updated_at)                                           AS last_seen_at,
      MIN(ST_DistanceSphere(m.geom, o.geom))::int                AS distance_meters,
      COUNT(*) * 5                                                AS overlap_duration_minutes  -- 5 min ≈ sample
    FROM   my      m
    JOIN   others  o
      ON   ST_DWithin(m.geom::geography,
                      o.geom::geography,
                      proximity_meters)
     AND   ABS(EXTRACT(EPOCH FROM (m.updated_at - o.updated_at))) <= 1800  -- within 30 min
    GROUP  BY o.profile_id, o.username, o.display_name, o.avatar_url
  )
  SELECT *
    FROM proximity
   ORDER BY last_seen_at DESC
   LIMIT 20;
END;
$$;

/* ──────────────────────────────────────────────
   3.  Permissions
   ────────────────────────────────────────────── */
GRANT EXECUTE ON FUNCTION public.people_crossed_paths_today(uuid, integer)
TO authenticated;