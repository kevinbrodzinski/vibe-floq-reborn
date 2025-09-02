SELECT plan(3);

-- ascending order when a < b
SELECT results_eq(
  $$ SELECT * FROM public.uuid_pair_low_high(
       '00000000-0000-0000-0000-000000000001'::uuid,
       '00000000-0000-0000-0000-000000000002'::uuid
     ) $$,
  $$ VALUES (
       '00000000-0000-0000-0000-000000000001'::uuid,
       '00000000-0000-0000-0000-000000000002'::uuid
     ) $$,
  'uuid_pair_low_high keeps (a,b) when a<b'
);

-- ascending order when a > b
SELECT results_eq(
  $$ SELECT * FROM public.uuid_pair_low_high(
       '00000000-0000-0000-0000-000000000002'::uuid,
       '00000000-0000-0000-0000-000000000001'::uuid
     ) $$,
  $$ VALUES (
       '00000000-0000-0000-0000-000000000001'::uuid,
       '00000000-0000-0000-0000-000000000002'::uuid
     ) $$,
  'uuid_pair_low_high swaps when a>b'
);

-- still returns something non-null
SELECT isnt(
  (SELECT low FROM public.uuid_pair_low_high(
     '00000000-0000-0000-0000-000000000001'::uuid,
     '00000000-0000-0000-0000-000000000002'::uuid)),
  NULL,
  'uuid_pair_low_high.low is not NULL'
);

SELECT * FROM finish();