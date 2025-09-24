-- Remove pg_notify triggers and use built-in postgres_changes instead
-- This leverages Supabase's automatic realtime replication

-- Drop the old pg_notify triggers
DROP TRIGGER IF EXISTS trg_field_tiles_broadcast ON public.field_tiles;
DROP TRIGGER IF EXISTS trg_field_tiles_delete ON public.field_tiles;

-- Drop the pg_notify functions since we don't need them
DROP FUNCTION IF EXISTS public.broadcast_field_delta();
DROP FUNCTION IF EXISTS public.broadcast_field_delete();

-- Ensure field_tiles table has REPLICA IDENTITY FULL for complete row data
ALTER TABLE public.field_tiles REPLICA IDENTITY FULL;