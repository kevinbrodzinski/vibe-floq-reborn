BEGIN;

--------------------------------------------------------------------
-- 1 ▸ Purge every previous overload of get_nearby_venues(…)
--------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'get_nearby_venues'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.get_nearby_venues(%s);',
      r.args
    );
  END LOOP;
END $$;

--------------------------------------------------------------------
-- 2 ▸ Fresh definition with the correct alias "venue_id"
--------------------------------------------------------------------
CREATE FUNCTION public.get_nearby_venues (
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_radius_km  INTEGER DEFAULT 2,
  p_limit      INTEGER DEFAULT 30
) RETURNS TABLE (
  venue_id   UUID,
  name       TEXT,
  distance_m INTEGER,
  vibe_tag   TEXT,
  people_now INTEGER
)
LANGUAGE sql
SECURITY INVOKER
AS $func$
  /* ----- A. venues inside the search circle -------------------- */
  WITH nearby AS (
    SELECT
      v.id                            AS venue_id,     -- 👈 alias fixed
      v.name,
      v.vibe                         AS vibe_tag,
      ST_Distance(
        v.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      )::INT                         AS distance_m
    FROM   public.venues v
    WHERE  ST_DWithin(
             v.location::geography,
             ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
             p_radius_km * 1000                       -- metres
           )
    ORDER  BY distance_m
    LIMIT  p_limit
  ),

  /* ----- B. live head-count ------------------------------------ */
  activity AS (
    SELECT vn.venue_id,
           COUNT(*)::INT AS people_now
    FROM   public.vibes_now vn
    WHERE  vn.expires_at > NOW()
    GROUP  BY vn.venue_id
  )

  /* ----- C. combine ------------------------------------------- */
  SELECT
    n.venue_id,
    n.name,
    n.distance_m,
    n.vibe_tag,
    COALESCE(a.people_now, 0) AS people_now
  FROM nearby   n
  LEFT JOIN activity a USING (venue_id)
  ORDER BY n.distance_m;
$func$;

--------------------------------------------------------------------
-- 3 ▸ Permissions
--------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_nearby_venues
  TO anon, authenticated;

COMMIT;