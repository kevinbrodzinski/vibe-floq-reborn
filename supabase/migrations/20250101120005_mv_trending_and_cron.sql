BEGIN;
SET search_path = public;

-- Ensure pg_cron is available (ignore if already installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Materialized view
DROP MATERIALIZED VIEW IF EXISTS public.mv_trending_venues;
CREATE MATERIALIZED VIEW public.mv_trending_venues AS
SELECT * FROM public.v_trending_venues;

-- Unique index → allows CONCURRENT refresh later if desired
CREATE UNIQUE INDEX IF NOT EXISTS mv_trending_venues_uidx
  ON public.mv_trending_venues(venue_id);

-- Repoint enriched view to the MV (readers hit MV)
DROP VIEW IF EXISTS public.v_trending_venues_enriched CASCADE;
CREATE VIEW public.v_trending_venues_enriched AS
SELECT
  tv.venue_id,
  v.name,
  v.provider,
  v.categories,
  v.photo_url,
  v.vibe       AS vibe_tag,
  v.vibe_score,
  v.live_count,
  tv.people_now,
  tv.visits_15m,
  tv.trend_score,
  tv.last_seen_at,
  COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) AS canonical_tags
FROM public.mv_trending_venues tv
JOIN public.venues v ON v.id = tv.venue_id;

-- Helper to refresh MV (you can call manually too)
CREATE OR REPLACE FUNCTION public.refresh_mv_trending_venues()
RETURNS void LANGUAGE sql AS $$
  REFRESH MATERIALIZED VIEW public.mv_trending_venues;
$$;

-- First refresh now
REFRESH MATERIALIZED VIEW public.mv_trending_venues;

-- Cron job every minute (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_mv_trending_venues_every_min') THEN
    PERFORM cron.schedule(
      'refresh_mv_trending_venues_every_min',
      '*/1 * * * *',
      'SELECT public.refresh_mv_trending_venues();'
    );
  END IF;
END$$;

COMMIT;