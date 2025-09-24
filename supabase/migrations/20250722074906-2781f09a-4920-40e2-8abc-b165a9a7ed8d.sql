-- Create sync_log table for rate limiting and deduplication
CREATE TABLE IF NOT EXISTS public.sync_log (
  id BIGSERIAL PRIMARY KEY,
  kind text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  ts timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS sync_log_lookup_idx ON public.sync_log(kind, lat, lng, ts);

-- Cleanup old logs (older than 24 hours)
DELETE FROM public.sync_log WHERE ts < now() - interval '24 hours';