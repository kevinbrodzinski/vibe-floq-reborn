BEGIN;
SELECT plan(2);

-- Core function existence checks
SELECT has_function('public', 'upsert_presence', 'upsert_presence() exists');

-- Core table existence checks
SELECT has_table('public', 'vibes_now', 'vibes_now table exists');

SELECT * FROM finish();
ROLLBACK;
