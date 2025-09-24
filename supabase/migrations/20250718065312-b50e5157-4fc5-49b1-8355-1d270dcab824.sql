-- ============================================================================
--  FIELD ·  Phase-2  •  realtime diffs  (per-tile channel + delete event)
-- ============================================================================

-- EXT
create extension if not exists pgcrypto;
create extension if not exists realtime;

-- UPDATE trigger: per-tile broadcast
create or replace function public.broadcast_field_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _delta int := new.crowd_count - coalesce(old.crowd_count,0);
begin
  if abs(_delta) < 1 then  -- ignore tiny moves
    return new;
  end if;

  perform realtime.broadcast(
    'field:' || new.tile_id,          -- channel
    'tile_update',                    -- event key
    json_build_object(
      'tile_id',      new.tile_id,
      'crowd_delta',  _delta,
      'crowd_count',  new.crowd_count,
      'avg_vibe',     new.avg_vibe,
      'updated_at',   new.updated_at
    )::jsonb
  );
  return new;
end;
$$;
grant execute on function public.broadcast_field_delta() to service_role;

-- DELETE trigger: tell clients to hide tile
create or replace function public.broadcast_field_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.broadcast(
    'field:' || old.tile_id,
    'tile_remove',
    json_build_object('tile_id', old.tile_id)::jsonb
  );
  return old;
end;
$$;
grant execute on function public.broadcast_field_delete() to service_role;

drop trigger if exists trg_field_tiles_broadcast on public.field_tiles;
create trigger trg_field_tiles_broadcast
after insert or update on public.field_tiles
for each row
when (new.crowd_count <> coalesce(old.crowd_count,0))
execute procedure public.broadcast_field_delta();

drop trigger if exists trg_field_tiles_delete on public.field_tiles;
create trigger trg_field_tiles_delete
after delete on public.field_tiles
for each row execute procedure public.broadcast_field_delete();