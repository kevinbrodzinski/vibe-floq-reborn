-- pgTAP tests for afterglow 4 AM cutoff logic
BEGIN;
SELECT plan(2);

-- seed test data
select test.seed_afterglow('00000000-0000-0000-0000-000000000001');

-- call the edge-equivalent SQL func directly
select * into temp _ag from public.generate_daily_afterglow_sql(
  '00000000-0000-0000-0000-000000000001',
  (now() at time zone 'UTC')::date - 1,  -- "yesterday" date arg
  4                                       -- cutoff_hour param
);

-- 1️⃣ should lump 22-03 into one afterglow (3 rows)
SELECT is( (select count(*) from _ag), 3, 'night moments included' );

-- 2️⃣ row at 05:00 should not be included
SELECT isnt( exists(select 1 from _ag where started_at::time > '04:00'), true,
             'post-cutoff moment excluded' );

SELECT * FROM finish();
ROLLBACK;