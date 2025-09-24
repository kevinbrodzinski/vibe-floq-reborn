-- 20250724_remove_legacy_presence.sql
-- Phase 3-B: Remove legacy friend_presence view that's no longer used
BEGIN;

-- Drop the legacy view completely since it's not being used
DROP VIEW IF EXISTS public.friend_presence CASCADE;

COMMIT;