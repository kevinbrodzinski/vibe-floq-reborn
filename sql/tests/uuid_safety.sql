SELECT plan(3);

-- safe casts to NULL for known sentinels
SELECT is( public.safe_uuid('null')::uuid, NULL, 'safe_uuid(null) -> NULL' );
SELECT is( public.safe_uuid('undefined')::uuid, NULL, 'safe_uuid(undefined) -> NULL' );

-- invalid UUID should still throw if not using safe_uuid
SELECT throws_ok(
  $$ SELECT 'not-a-uuid'::uuid; $$,
  'invalid input syntax for type uuid',
  'raw cast on invalid string throws'
);

SELECT * FROM finish();