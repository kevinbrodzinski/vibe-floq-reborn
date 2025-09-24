/* ============================================================
   Phase 4 – Location-system migration  (PostGIS edition)
   ============================================================
   Safe to run repeatedly – all IF NOT EXISTS / OR REPLACE.
   Requires extensions: pgcrypto (for gen_random_uuid) + postgis
   ------------------------------------------------------------
*/

/* ---------- 0. Extensions ------------------------------------------------ */
CREATE EXTENSION IF NOT EXISTS pgcrypto;          -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;           -- geography, ST_*

/* ---------- 1. Tables ---------------------------------------------------- */

-- 1A. Historical trail of every fix
CREATE TABLE IF NOT EXISTS public.location_history (
  id           uuid PRIMARY KEY                DEFAULT gen_random_uuid(),
  profile_id   uuid      NOT NULL,
  latitude     double precision NOT NULL,
  longitude    double precision NOT NULL,
  accuracy     double precision,
  recorded_at  timestamptz      NOT NULL       DEFAULT now(),
  created_at   timestamptz      NOT NULL       DEFAULT now(),
  /* geog generated later */
  CONSTRAINT location_history_coords_chk
    CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
  CONSTRAINT location_history_accuracy_chk
    CHECK (accuracy IS NULL OR accuracy >= 0)
);

-- 1B. Current live position (one row per user)
CREATE TABLE IF NOT EXISTS public.live_positions (
  id           uuid PRIMARY KEY                DEFAULT gen_random_uuid(),
  profile_id   uuid UNIQUE NOT NULL,
  latitude     double precision NOT NULL,
  longitude    double precision NOT NULL,
  accuracy     double precision,
  vibe         text,
  visibility   text NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public','friends','private')),
  last_updated timestamptz      NOT NULL       DEFAULT now(),
  expires_at   timestamptz      NOT NULL       DEFAULT (now() + interval '5 minutes'),
  created_at   timestamptz      NOT NULL       DEFAULT now(),
  /* geog generated later */
  CONSTRAINT live_positions_coords_chk
    CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
  CONSTRAINT live_positions_accuracy_chk
    CHECK (accuracy IS NULL OR accuracy >= 0)
);

-- 1C. System & performance metrics
CREATE TABLE IF NOT EXISTS public.location_metrics (
  id           uuid PRIMARY KEY                DEFAULT gen_random_uuid(),
  profile_id   uuid,
  metric_name  text            NOT NULL,
  metric_value numeric         NOT NULL,
  metadata     jsonb           NOT NULL        DEFAULT '{}'::jsonb,
  recorded_at  timestamptz     NOT NULL        DEFAULT now(),
  CONSTRAINT location_metrics_metric_chk
    CHECK (metric_name IN (
      'location_fix','sharing_operation','performance','error',
      'cleanup_deleted_positions'
    ))
);

/* ---------- 2. Row-level security --------------------------------------- */
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_positions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_metrics ENABLE ROW LEVEL SECURITY;

/* ---------- 3. RLS policies --------------------------------------------- */

-- location_history – user owns their rows
DROP POLICY IF EXISTS location_history_own     ON public.location_history;
CREATE POLICY location_history_own
  ON public.location_history
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- live_positions – user owns row; public read of non-expired
DROP POLICY IF EXISTS live_positions_own       ON public.live_positions;
CREATE POLICY live_positions_own
  ON public.live_positions
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS live_positions_read_public ON public.live_positions;
CREATE POLICY live_positions_read_public
  ON public.live_positions
  FOR SELECT
  USING (visibility = 'public' AND expires_at > now());

-- location_metrics – user or system
DROP POLICY IF EXISTS location_metrics_own     ON public.location_metrics;
CREATE POLICY location_metrics_own
  ON public.location_metrics
  USING (profile_id = auth.uid() OR profile_id IS NULL)
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

/* ---------- 4. PostGIS geography columns -------------------------------- */

-- Generated columns (no data copy, immutable)
ALTER TABLE public.location_history
  ADD COLUMN IF NOT EXISTS geog geography(Point,4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)) STORED;

ALTER TABLE public.live_positions
  ADD COLUMN IF NOT EXISTS geog geography(Point,4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)) STORED;

/* ---------- 5. Indexes --------------------------------------------------- */

-- B-tree
CREATE INDEX IF NOT EXISTS idx_location_history_profile_recorded
  ON public.location_history (profile_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_positions_expires_visibility
  ON public.live_positions  (expires_at DESC, visibility);

CREATE INDEX IF NOT EXISTS idx_location_metrics_recorded
  ON public.location_metrics (recorded_at DESC);

-- GiST spatial
CREATE INDEX IF NOT EXISTS idx_location_history_geog
  ON public.location_history USING gist (geog);

CREATE INDEX IF NOT EXISTS idx_live_positions_geog
  ON public.live_positions   USING gist (geog);

/* ---------- 6. PostGIS-optimised helper functions ----------------------- */

-- 6A. Upsert / deduplicate live position
CREATE OR REPLACE FUNCTION public.upsert_live_position(
  p_profile_id   uuid,
  p_latitude     double precision,
  p_longitude    double precision,
  p_accuracy     double precision DEFAULT NULL,
  p_vibe         text            DEFAULT NULL,
  p_visibility   text            DEFAULT 'public'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geog   geography := ST_SetSRID(ST_MakePoint(p_longitude,p_latitude),4326);
  v_row    live_positions%ROWTYPE;
  v_id     uuid;
BEGIN
  /* basic sanity */
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id is required';
  END IF;
  IF NOT (p_latitude BETWEEN -90 AND 90) THEN
    RAISE EXCEPTION 'invalid latitude %', p_latitude;
  END IF;
  IF NOT (p_longitude BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'invalid longitude %', p_longitude;
  END IF;

  SELECT * INTO v_row
  FROM live_positions
  WHERE profile_id = p_profile_id;

  IF FOUND
     AND v_row.last_updated > now() - interval '10 seconds'
     AND ST_DWithin(v_row.geog, v_geog, 3)         -- within 3 m
  THEN
    RETURN v_row.id;                               -- skip tiny duplicate
  END IF;

  INSERT INTO live_positions (
    profile_id, latitude, longitude, accuracy,
    vibe, visibility, last_updated, expires_at
  ) VALUES (
    p_profile_id, p_latitude, p_longitude, p_accuracy,
    p_vibe, p_visibility, now(), now() + interval '5 minutes'
  )
  ON CONFLICT (profile_id) DO UPDATE
    SET latitude     = EXCLUDED.latitude,
        longitude    = EXCLUDED.longitude,
        accuracy     = EXCLUDED.accuracy,
        vibe         = EXCLUDED.vibe,
        visibility   = EXCLUDED.visibility,
        last_updated = now(),
        expires_at   = now() + interval '5 minutes'
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6B. Nearby query
CREATE OR REPLACE FUNCTION public.get_nearby_live_positions(
  p_latitude   double precision,
  p_longitude  double precision,
  p_radius_m   integer DEFAULT 250,
  p_limit      integer DEFAULT 50
)
RETURNS TABLE(
  profile_id   uuid,
  latitude     double precision,
  longitude    double precision,
  distance_m   double precision,
  accuracy     double precision,
  vibe         text,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_center geography := ST_SetSRID(ST_MakePoint(p_longitude,p_latitude),4326);
BEGIN
  RETURN QUERY
  SELECT
    lp.profile_id,
    lp.latitude,
    lp.longitude,
    ST_Distance(lp.geog, v_center)::double precision AS distance_m,
    lp.accuracy,
    lp.vibe,
    lp.last_updated
  FROM live_positions lp
  WHERE lp.visibility = 'public'
    AND lp.expires_at > now()
    AND ST_DWithin(lp.geog, v_center, p_radius_m)
  ORDER BY ST_Distance(lp.geog, v_center)
  LIMIT p_limit;
END;
$$;

-- 6C. House-keeping
CREATE OR REPLACE FUNCTION public.cleanup_expired_live_positions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM live_positions WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    INSERT INTO location_metrics (metric_name, metric_value, recorded_at)
    VALUES ('cleanup_deleted_positions', v_deleted, now());
  END IF;

  RETURN v_deleted;
END;
$$;

/* ---------- 7. Grants --------------------------------------------------- */
GRANT EXECUTE ON FUNCTION public.upsert_live_position(
    uuid,double precision,double precision,double precision,text,text)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_nearby_live_positions(
    double precision,double precision,integer,integer)
  TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_live_positions()
  TO service_role;