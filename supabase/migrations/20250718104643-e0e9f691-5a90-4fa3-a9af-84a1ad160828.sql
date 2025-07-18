-- 20250718T1530-field-presence-and-broadcast.sql (fixed v2)
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
  insert into public.vibes_now as v (
    user_id, 
    vibe, 
    location, 
    updated_at, 
    expires_at
  )
  values (
    auth.uid(), 
    p_vibe::vibe_enum,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geometry,
    now(),
    now() + interval '2 minutes'
  )
  on conflict (user_id)
  do update
     set vibe       = excluded.vibe,
         location   = excluded.location,
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at;
$$;

-- RLS
alter table public.vibes_now enable row level security;
drop policy if exists "self-write" on public.vibes_now;
create policy "self-write" on public.vibes_now
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

--------------------------------------------------------------------------------
-- 2.  Broadcast tile deltas ----------------------------------------------------
create or replace function public.broadcast_field_delta()
returns trigger
language plpgsql
as $$
begin
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