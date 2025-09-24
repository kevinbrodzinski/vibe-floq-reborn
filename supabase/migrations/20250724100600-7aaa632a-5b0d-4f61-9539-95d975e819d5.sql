-- 05_partition_rollover.sql
-- Auto-create next month's partitions
SELECT cron.schedule(
  'create_next_raw_loc_part',
  '0 0 25 * *',
$$
DO $inner$
DECLARE
  n DATE := date_trunc('month', now() + INTERVAL '1 month');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.raw_locations_%s PARTITION OF public.raw_locations
     FOR VALUES FROM (%L) TO (%L)',
    to_char(n,'YYYYMM'), n, n + INTERVAL '1 month'
  );
END
$inner$;
$$);