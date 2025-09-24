BEGIN;

/* ------------------------------------------------------------------
   walkable_floqs — return upcoming floqs within N metres of (lat,lng)
   Author: Floq team
   Notes:
     • SECURITY INVOKER so RLS applies.
     • search_path pinned to public.
------------------------------------------------------------------- */

CREATE OR REPLACE FUNCTION public.walkable_floqs(
  p_lat          double precision,
  p_lng          double precision,
  p_metres       integer DEFAULT 1200
)
RETURNS TABLE (
  id                uuid,
  title             text,
  starts_at         timestamptz,
  primary_vibe      vibe_enum,
  distance_meters   double precision,
  participant_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public
AS $func$
  WITH me AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geometry AS loc
  ),
  cand AS (
    SELECT
      f.id,
      f.title,
      f.starts_at,
      f.primary_vibe,
      ST_DistanceSphere(f.location, me.loc) AS dist
    FROM public.floqs        f,
         me
    WHERE COALESCE(f.ends_at, f.starts_at + interval '4 hours') > now()
      AND f.deleted_at IS NULL
      AND ST_DWithin(f.location::geography,
                     me.loc::geography,
                     p_metres)
  )
  SELECT
    cand.id,
    cand.title,
    cand.starts_at,
    cand.primary_vibe,
    cand.dist                             AS distance_meters,
    (SELECT COUNT(*)
       FROM public.floq_participants fp
      WHERE fp.floq_id = cand.id)         AS participant_count
  FROM cand
  ORDER BY cand.dist;
$func$;

/* ---------- Recommended index if not already present ------------- */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'floqs'
      AND indexname  = 'idx_floqs_location_gist'
  ) THEN
    EXECUTE 'CREATE INDEX idx_floqs_location_gist ON public.floqs USING GIST (location);';
  END IF;
END$$;

COMMIT;