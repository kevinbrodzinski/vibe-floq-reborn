begin;

select plan(3);

-- seed two vibe states with correct column names 
insert into public.user_vibe_states
  (user_id, gh5, vibe_h, vibe_s, vibe_l, vibe_tag, active, started_at, location)
values
  ('00000000-0000-0000-0000-000000000001', '9q5cs', 0.33, 0.9, 0.8, 'chill', true, now(), ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)),
  ('00000000-0000-0000-0000-000000000002', '9q5cs', 0.66, 0.5, 0.7, 'hype', true, now(), ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326));

call public.refresh_field_tiles();

-- 1. row exists
select ok(
  (select count(*) from public.field_tiles where tile_id='9q5cs') = 1,
  'tile row inserted'
);

-- 2. crowd_count = 2
select is(
  (select crowd_count from public.field_tiles where tile_id='9q5cs'),
  2,
  'crowd_count aggregated'
);

-- 3. avg_hue ≈ 0.495 (check JSON hue value)
select cmp_ok(
  (select (avg_vibe->>'h')::float from public.field_tiles where tile_id='9q5cs'),
  '>=',
  0.49,
  'avg hue calculated'
);

select finish();

rollback;