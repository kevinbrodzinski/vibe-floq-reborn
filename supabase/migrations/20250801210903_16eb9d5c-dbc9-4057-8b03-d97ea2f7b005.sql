-- Drop old bump_interaction function overload to prevent version conflicts
-- This ensures Postgres chooses the correct function signature

DROP FUNCTION IF EXISTS public.bump_interaction(uuid, text, text);