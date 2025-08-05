-- 20250724_remove_legacy_presence.sql
-- Phase 3-B: Remove legacy friend_presence table that's no longer used
BEGIN;

-- Drop the legacy table completely since it's not being used
DROP TABLE IF EXISTS public.friend_presence CASCADE;

COMMIT;