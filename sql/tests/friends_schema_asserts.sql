SELECT plan(4);

-- v_friends_with_presence must NOT expose legacy 'state' column
SELECT is(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='v_friends_with_presence' AND column_name='state'),
  0::bigint,
  'v_friends_with_presence: no legacy state column'
);

-- v_friends_with_presence must expose friend_state
SELECT is(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='v_friends_with_presence' AND column_name='friend_state'),
  1::bigint,
  'v_friends_with_presence: has friend_state'
);

-- uniqueness on friend_requests directed pair exists
SELECT is(
  (SELECT COUNT(*) FROM pg_indexes
   WHERE schemaname='public' AND indexname='friend_requests_dir_unique'),
  1::bigint,
  'friend_requests_dir_unique index exists'
);

-- check constraint on friendships ordering exists
SELECT is(
  (SELECT COUNT(*) FROM pg_constraint
   WHERE conname='friendships_low_high_order' AND conrelid='public.friendships'::regclass),
  1::bigint,
  'friendships_low_high_order constraint exists'
);

SELECT * FROM finish();