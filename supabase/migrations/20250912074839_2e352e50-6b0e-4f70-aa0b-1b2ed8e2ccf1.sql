-- Add performance indexes for field tiles enhanced function

-- Fast field tiles queries with time filtering
create index if not exists idx_field_tiles_tile_updated 
  on field_tiles(tile_id, updated_at desc);

-- Existing indexes (ensure they exist)
create index if not exists idx_rally_messages_thread_created
  on rally_messages(thread_id, created_at);

create index if not exists idx_rally_last_seen_profile_rally
  on rally_last_seen(profile_id, rally_id);