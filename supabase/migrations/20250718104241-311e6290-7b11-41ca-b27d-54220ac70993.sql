-- 20250718T1530-field-presence-and-broadcast.sql
--------------------------------------------------------------------------------
-- 1.  Presence upsert ----------------------------------------------------------
create or replace function public.upsert_presence(
  p_lat  double precision,
  p_lng  double precision,
  p_vibe text default 'chill'
) returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.vibes_now as v (id, lat, lng, vibe, updated_at)
  values (auth.uid(), p_lat, p_lng, p_vibe, now())
  on conflict (id)
  do update
     set lat        = excluded.lat,
         lng        = excluded.lng,
         vibe       = excluded.vibe,
         updated_at = now();
$$;

-- RLS
alter table public.vibes_now enable row level security;
drop policy if exists "self-write" on public.vibes_now;
create policy "self-write" on public.vibes_now
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

--------------------------------------------------------------------------------
-- 2.  Broadcast tile deltas ----------------------------------------------------
create or replace function public.broadcast_field_delta()
returns trigger
language plpgsql
as $$
begin
  -- suppress small changes (<10) if desired
  -- if abs(new.crowd_count - coalesce(old.crowd_count,0)) < 10 then
  --   return new;
  -- end if;

  perform pg_notify(
    'field_tile_update',
    json_build_object(
      'tile_id',      new.tile_id,
      'crowd_delta',  new.crowd_count - coalesce(old.crowd_count, 0),
      'crowd_count',  new.crowd_count,
      'avg_vibe',     new.avg_vibe,
      'updated_at',   new.updated_at
    )::text
  );
  return new;
end;
$$;

drop trigger if exists trg_field_tiles_broadcast on public.field_tiles;
create trigger trg_field_tiles_broadcast
  after insert or update on public.field_tiles
  for each row execute function public.broadcast_field_delta();