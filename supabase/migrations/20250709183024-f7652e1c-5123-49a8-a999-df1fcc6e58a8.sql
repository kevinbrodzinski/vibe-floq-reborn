-- Phase 2 · Geohash-Bucketed Realtime Architecture  ──────────────────
-- Enable required extensions (safe to run repeatedly)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

--------------------------------------------------------------------
-- 1 · GEOHASH bucket  (≈ 1.2 km at precision-6)                    --
--------------------------------------------------------------------
ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS geohash6 text
  GENERATED ALWAYS AS (ST_GeoHash(location, 6)) STORED;

-- Covering index for live rows in the bucket
CREATE INDEX IF NOT EXISTS idx_vibes_now_geohash6
  ON public.vibes_now (geohash6)
  WHERE expires_at > now();

--------------------------------------------------------------------
-- 2 · NOTIFY / LISTEN plumbing                                     --
--------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.presence_notify() CASCADE;

CREATE OR REPLACE FUNCTION public.presence_notify()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rec record;                     -- holds either NEW or OLD
BEGIN
  rec := COALESCE(NEW, OLD);      -- DELETE → OLD, others → NEW

  -- Skip broadcast when row is already expired
  IF rec.expires_at IS NULL OR rec.expires_at < now() THEN
    RETURN rec;
  END IF;

  PERFORM pg_notify(
    'presence:' || rec.geohash6,  -- channel name
    jsonb_build_object(
      'op'        , TG_OP,        -- INSERT · UPDATE · DELETE
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

-- INSERT trigger
CREATE TRIGGER trg_presence_notify_ins
AFTER INSERT ON public.vibes_now
FOR EACH ROW EXECUTE PROCEDURE public.presence_notify();

-- UPDATE trigger (only when columns that matter change)
CREATE TRIGGER trg_presence_notify_upd
AFTER UPDATE OF vibe, location, venue_id, expires_at
ON public.vibes_now
FOR EACH ROW EXECUTE PROCEDURE public.presence_notify();

-- DELETE trigger
CREATE TRIGGER trg_presence_notify_del
AFTER DELETE ON public.vibes_now
FOR EACH ROW EXECUTE PROCEDURE public.presence_notify();

--------------------------------------------------------------------
-- 3 · pg_cron cleanup every 2 min                                  --
--------------------------------------------------------------------
-- Will silently NO-OP if job already exists
SELECT cron.schedule(
  'vibes_gc',                       -- unique job name
  '*/2 * * * *',                    -- every 2 minutes
  $$DELETE FROM public.vibes_now
      WHERE expires_at < now();$$
)
ON CONFLICT DO NOTHING;

--------------------------------------------------------------------
-- 4 · Grant                                                        --
--------------------------------------------------------------------
GRANT USAGE, SELECT ON public.vibes_now TO authenticated;