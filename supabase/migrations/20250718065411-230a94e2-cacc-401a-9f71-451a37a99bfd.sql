-- ============================================================================
--  FIELD ·  Phase-2  •  realtime diffs  (per-tile channel + delete event)
-- ============================================================================

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

  perform pg_notify(
    'field:' || new.tile_id,          -- channel
    json_build_object(
      'type',         'tile_update',
      'tile_id',      new.tile_id,
      'crowd_delta',  _delta,
      'crowd_count',  new.crowd_count,
      'avg_vibe',     new.avg_vibe,
      'updated_at',   new.updated_at
    )::text
  );
  return new;
end;
$$;

-- DELETE trigger: tell clients to hide tile
create or replace function public.broadcast_field_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_notify(
    'field:' || old.tile_id,
    json_build_object(
      'type', 'tile_remove',
      'tile_id', old.tile_id
    )::text
  );
  return old;
end;
$$;

drop trigger if exists trg_field_tiles_broadcast on public.field_tiles;
create trigger trg_field_tiles_broadcast
after insert or update on public.field_tiles
for each row execute procedure public.broadcast_field_delta();

drop trigger if exists trg_field_tiles_delete on public.field_tiles;
create trigger trg_field_tiles_delete
after delete on public.field_tiles
for each row execute procedure public.broadcast_field_delete();