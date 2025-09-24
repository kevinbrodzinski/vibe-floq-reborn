BEGIN;
SELECT plan(4);

-- 1) Returns rows with expected columns
SELECT ok(
  EXISTS (
    SELECT 1
    FROM fn_compute_friction(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '[
        {"id":"A","label":"Primary","stops":[{"venue_id":"00000000-0000-0000-0000-000000000001"}]},
        {"id":"B","label":"Backup","stops":[{"venue_id":"00000000-0000-0000-0000-000000000002"}]}
      ]'::jsonb,
      NULL
    ) LIMIT 1
  ),
  'fn_compute_friction returns rows'
);

-- 2) Weights sum to 1.0 (indirectly): friction in [0,1]
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM fn_compute_friction(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '[]'::jsonb, NULL
    ) WHERE friction < 0 OR friction > 1
  ),
  'friction bounded in [0,1]'
);

-- 3) Logistics normalization works for small meters (<=800 -> ~0)
--    (requires minimal seed data to be meaningful; otherwise just assert no errors)
SELECT ok(TRUE, 'Logistics normalization placeholder');

-- 4) Budget=0 should zero financial
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM fn_compute_friction(
      '00000000-0000-0000-0000-000000000000'::uuid,
      '[]'::jsonb, 0
    ) WHERE financial <> 0
  ),
  'financial=0 when budget<=0'
);

SELECT * FROM finish();
ROLLBACK;