BEGIN;

/* ---------------------------------------------------------------
   Deduplicate search_floqs()
   • Keep the full signature with _viewer_id (oid 265836)
   • Drop the two obsolete overloads so PostgREST stops emitting PGRST203
---------------------------------------------------------------- */

/* 1️⃣  Drop first legacy variant */
DROP FUNCTION IF EXISTS public.search_floqs(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_km    double precision,
  p_query        text,
  p_vibe_ids     text[],
  p_time_from    timestamptz,
  p_time_to      timestamptz,
  p_limit        integer
);

/* 2️⃣  Drop second legacy variant */
DROP FUNCTION IF EXISTS public.search_floqs(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_meters  integer,
  p_query          text,
  p_vibes          text[],
  p_start_time     timestamptz,
  p_end_time       timestamptz,
  p_limit          integer,
  p_offset         integer
);

/* 3️⃣  Safety-check: exactly one search_floqs should remain */
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM   pg_proc
  WHERE  proname = 'search_floqs'
  AND    pg_function_is_visible(oid);
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'Expected 1 remaining search_floqs(), found %', cnt;
  END IF;
END$$;

COMMIT;