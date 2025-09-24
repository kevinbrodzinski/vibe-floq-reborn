-- Create people_crossed_paths_today function
-- This function finds users who crossed paths within proximity in the last 24 hours

CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(
  in_me            uuid,
  proximity_meters integer DEFAULT 25
)
RETURNS TABLE (
  other_profile_id uuid,
  first_seen       timestamptz,
  last_seen        timestamptz,
  close_contacts   integer          -- how many times they came within range
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /*— guard rails —*/
  IF in_me IS NULL THEN
    RAISE EXCEPTION 'caller must supply their own profile_id (in_me)';
  END IF;

  /*— 24-hour window —*/
  RETURN QUERY
  WITH my_pings AS (
    SELECT      ts, location
    FROM        vibes_log              -- 🔁 use your real ping table
    WHERE       profile_id = in_me
      AND       ts >= now() - interval '24 hours'
  ),
  other_pings AS (
    SELECT      profile_id,
                ts,
                location
    FROM        vibes_log
    WHERE       profile_id <> in_me
      AND       ts >= now() - interval '24 hours'
  ),
  close_events AS (
    SELECT      o.profile_id      AS other_id,
                LEAST(o.ts, m.ts) AS ts_pair,
                o.ts              AS other_ts
    FROM        my_pings   m
    JOIN        other_pings o
      ON  ST_DWithin(m.location, o.location, proximity_meters)
      AND ABS(EXTRACT(EPOCH FROM (m.ts - o.ts))) <= 600  -- within 10 min
  )
  SELECT
      other_id                         AS other_profile_id,
      MIN(ts_pair)  FILTER (WHERE ts_pair IS NOT NULL)  AS first_seen,
      MAX(ts_pair)  FILTER (WHERE ts_pair IS NOT NULL)  AS last_seen,
      COUNT(*)                                            AS close_contacts
  FROM  close_events
  GROUP BY other_id
  ORDER BY last_seen DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.people_crossed_paths_today(uuid, integer)
  TO authenticated;