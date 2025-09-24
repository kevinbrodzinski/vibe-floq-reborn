
-- Phase 2: Geohash-Bucketed Realtime Architecture (CORRECTED)
-- Enable PostGIS & pg_cron (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

--------------------------------------------------------------------
-- 1.  GEOHASH BUCKET  (≈1.2 km @ geohash-6)  ----------------------
--------------------------------------------------------------------
ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS geohash6 TEXT
  GENERATED ALWAYS AS (ST_GeoHash(location, 6)) STORED;

-- Fast look-ups
CREATE INDEX IF NOT EXISTS idx_vibes_now_geohash6
  ON public.vibes_now (geohash6)
  WHERE expires_at > NOW();

--------------------------------------------------------------------
-- 2. NOTIFY / LISTEN plumbing  ------------------------------------
--------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.presence_notify() CASCADE;

CREATE OR REPLACE FUNCTION public.presence_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;        -- will hold either NEW or OLD
BEGIN
  rec := COALESCE(NEW, OLD);  -- DELETE ⇒ OLD, others ⇒ NEW

  -- Ignore broadcasts for rows that are already expired
  IF (rec.expires_at IS NULL OR rec.expires_at < NOW()) THEN
    RETURN rec;
  END IF;

  PERFORM pg_notify(
    'presence:' || rec.geohash6,
    jsonb_build_object(
      'op'        , TG_OP,           -- INSERT | UPDATE | DELETE
      'user_id'   , rec.user_id,
      'vibe'      , rec.vibe,
      'lat'       , ST_Y(rec.location),
      'lng'       , ST_X(rec.location),
      'venue_id'  , rec.venue_id,
      'expires_at', rec.expires_at
    )::text
  );
  RETURN rec;
END;
$$;

-- Clean slate
DROP TRIGGER IF EXISTS trg_presence_notify_ins  ON public.vibes_now;
DROP TRIGGER IF EXISTS trg_presence_notify_upd  ON public.vibes_now;
DROP TRIGGER IF EXISTS trg_presence_notify_del  ON public.vibes_now;

CREATE TRIGGER trg_presence_notify_ins
AFTER INSERT ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.presence_notify();

CREATE TRIGGER trg_presence_notify_upd
AFTER UPDATE OF vibe, location, venue_id, expires_at ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.presence_notify();

CREATE TRIGGER trg_presence_notify_del
AFTER DELETE ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.presence_notify();

--------------------------------------------------------------------
-- 3. pg_cron cleanup every 2 min  ---------------------------------
--------------------------------------------------------------------
SELECT cron.schedule(
  'vibes_gc',                       -- job name
  '*/2 * * * *',                    -- every 2 minutes
  $$DELETE FROM public.vibes_now
      WHERE expires_at < NOW();$$
);

--------------------------------------------------------------------
-- 4. Grant   -------------------------------------------------------
--------------------------------------------------------------------
GRANT USAGE, SELECT ON public.vibes_now  TO authenticated;
