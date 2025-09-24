-- pgTAP tests for weekly AI suggestions functionality
SET search_path = test, public, extensions;

BEGIN;

SELECT plan(3);

-- 1️⃣ Insert via service role succeeds
SELECT ok(
  (INSERT INTO public.weekly_ai_suggestions (user_id, week_ending, json) 
   VALUES (extensions.gen_random_uuid(), current_date, '{"text": "test suggestion", "generated_at": "2025-01-01T00:00:00Z"}') 
   RETURNING true),
  'upsert insert works'
);

-- 2️⃣ RLS: anon blocked
SET LOCAL role = anon;
SELECT throws_ok(
  $$INSERT INTO public.weekly_ai_suggestions (user_id, week_ending, json) 
    VALUES ('00000000-0000-0000-0000-000000000000', current_date, '{}')$$,
  'permission denied',
  'anon cannot insert'
);

-- 3️⃣ Cache fetch fast-paths
RESET role;
SELECT is(
  (SELECT count(*) >= 1 FROM public.weekly_ai_suggestions),
  true,
  'at least one row present'
);

SELECT * FROM finish();
ROLLBACK;