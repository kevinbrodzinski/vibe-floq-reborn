-- Drop old overload
DROP FUNCTION IF EXISTS public.people_crossed_paths_today(uuid, integer);

CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(
  in_me             uuid,
  proximity_meters  integer DEFAULT 25
)
RETURNS TABLE (
  profile_id                  uuid,
  username                    text,
  display_name                text,
  avatar_url                  text,
  last_seen_at                timestamptz,
  distance_meters             integer,
  overlap_duration_minutes    integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  today_end   timestamptz := today_start + interval '1 day';
BEGIN
  RETURN QUERY
  WITH excluded_friends AS (
    /* accepted friendships */
    SELECT CASE WHEN f.user_low = in_me THEN f.user_high ELSE f.user_low END
    FROM   friendships f
    WHERE  (f.user_low = in_me OR f.user_high = in_me)
      AND  f.friend_state = 'accepted'

    UNION

    /* outgoing or incoming pending requests */
    SELECT fr.other_profile_id
    FROM   friend_requests fr
    WHERE  (fr.profile_id = in_me OR fr.other_profile_id = in_me)
      AND  fr.status = 'pending'
  ),

  my_locations AS (
    SELECT ST_Y(vl.location::geometry) AS lat,
           ST_X(vl.location::geometry) AS lng,
           vl.updated_at
    FROM   vibes_log vl
    WHERE  vl.profile_id = in_me
      AND  vl.updated_at >= today_start
      AND  vl.updated_at <  today_end
      AND  vl.location   IS NOT NULL
  ),

  other_locations AS (
    SELECT vl.profile_id,
           ST_Y(vl.location::geometry) AS lat,
           ST_X(vl.location::geometry) AS lng,
           vl.updated_at,
           p.username,
           p.display_name,
           p.avatar_url
    FROM   vibes_log vl
    JOIN   profiles  p ON p.id = vl.profile_id
    WHERE  vl.profile_id <> in_me
      AND  vl.profile_id NOT IN (SELECT * FROM excluded_friends)
      AND  vl.updated_at >= today_start
      AND  vl.updated_at <  today_end
      AND  vl.location   IS NOT NULL
  ),

  proximity_events AS (
    SELECT DISTINCT
           ol.profile_id,
           ol.username,
           ol.display_name,
           ol.avatar_url,
           MAX(ol.updated_at)                           AS last_seen_at,
           MIN(ST_DistanceSphere(
                 ST_SetSRID(ST_MakePoint(ml.lng, ml.lat), 4326),
                 ST_SetSRID(ST_MakePoint(ol.lng, ol.lat), 4326)
           ))                                           AS min_distance,
           COUNT(*) * 5                                 AS overlap_duration_minutes
    FROM   my_locations    ml
    CROSS  JOIN other_locations ol
    WHERE  ST_DistanceSphere(
             ST_SetSRID(ST_MakePoint(ml.lng, ml.lat), 4326),
             ST_SetSRID(ST_MakePoint(ol.lng, ol.lat), 4326)
           ) <= proximity_meters
      AND  ABS(EXTRACT(EPOCH FROM (ml.updated_at - ol.updated_at))) <= 1800
    GROUP  BY ol.profile_id, ol.username, ol.display_name, ol.avatar_url
  )

  SELECT  profile_id,
          username,
          display_name,
          avatar_url,
          last_seen_at,
          ROUND(min_distance)::int        AS distance_meters,
          overlap_duration_minutes
  FROM    proximity_events
  ORDER BY last_seen_at DESC, min_distance
  LIMIT   50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.people_crossed_paths_today(uuid, integer)
  TO authenticated;