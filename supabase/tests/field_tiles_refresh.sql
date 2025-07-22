begin;

select plan(3);

-- seed two vibe rows
insert into public.vibes_now
  (user_id, gh5, vibe_hsv, floq_id)
values
  ('00000000-0000-0000-0000-000000000001', '9q5cs', '[0.33,0.9,0.8]', null),
  ('00000000-0000-0000-0000-000000000002', '9q5cs', '[0.66,0.5,0.7]', '42beef');

call public.refresh_field_tiles();

-- 1. row exists
select ok(
  (select count(*) from public.field_tiles where tile_id='9q5cs') = 1,
  'tile row inserted'
);

-- 2. crowd_count = 2
select is(
  (select crowd_count from public.field_tiles where tile_id='9q5cs'),
  2::bigint,
  'crowd_count aggregated'
);

-- 3. avg_hue ≈ 0.495
select cmp_ok(
  (select (avg_vibe->>0)::float from public.field_tiles where tile_id='9q5cs'),
  '>=',
  0.49,
  'avg hue calculated'
);

select finish();

rollback;