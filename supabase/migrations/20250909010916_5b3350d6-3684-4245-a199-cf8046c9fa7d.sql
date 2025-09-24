-- Add ang_bin column and unique index for stable trade winds upserts
ALTER TABLE IF EXISTS trade_winds
  ADD COLUMN IF NOT EXISTS ang_bin int;

CREATE UNIQUE INDEX IF NOT EXISTS trade_winds_unique_lane
  ON trade_winds (city_id, hour_bucket, dow, ang_bin);

-- Enable nightly trade winds refresh at 3:10 AM UTC
-- Note: This requires pg_cron extension to be enabled
SELECT cron.schedule(
  'refresh-trade-winds',
  '10 3 * * *',
  $$SELECT public.refresh_trade_winds_all('00000000-0000-0000-0000-000000000001'::uuid)$$
);