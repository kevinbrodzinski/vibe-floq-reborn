-- Update remaining user_id references to profile_id
-- This script updates indexes, policies, and functions that still reference user_id

BEGIN;

-- 1. Update indexes that reference user_id
DROP INDEX IF EXISTS idx_vibes_now_user_id;
CREATE INDEX IF NOT EXISTS idx_vibes_now_profile_id ON public.vibes_now(profile_id);

DROP INDEX IF EXISTS idx_fav_user;
CREATE INDEX IF NOT EXISTS idx_fav_profile ON public.user_favorites(profile_id);

DROP INDEX IF EXISTS idx_vnm_user_latlng;
CREATE INDEX IF NOT EXISTS idx_vnm_profile_latlng ON public.venues_near_me(profile_id, lat, lng);

DROP INDEX IF EXISTS vibes_now_user_id_idx;
CREATE INDEX IF NOT EXISTS vibes_now_profile_id_idx ON vibes_now(profile_id);

DROP INDEX IF EXISTS user_vibe_states_user_id_active_idx;
CREATE INDEX IF NOT EXISTS user_vibe_states_profile_id_active_idx ON user_vibe_states(profile_id) WHERE active = true;

-- 2. Update RLS policies that reference user_id
-- Note: These policies should be updated to use profile_id instead of user_id
-- The exact table names and policy names may need to be adjusted based on your schema

-- Example for vibes_now table
DROP POLICY IF EXISTS "Users can view their own vibes" ON public.vibes_now;
CREATE POLICY "Users can view their own vibes" ON public.vibes_now
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own vibes" ON public.vibes_now;
CREATE POLICY "Users can insert their own vibes" ON public.vibes_now
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own vibes" ON public.vibes_now;
CREATE POLICY "Users can update their own vibes" ON public.vibes_now
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Example for user_vibe_states table
DROP POLICY IF EXISTS "Users can view their own vibe states" ON public.user_vibe_states;
CREATE POLICY "Users can view their own vibe states" ON public.user_vibe_states
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own vibe states" ON public.user_vibe_states;
CREATE POLICY "Users can insert their own vibe states" ON public.user_vibe_states
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Example for user_favorites table
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
CREATE POLICY "Users can view their own favorites" ON public.user_favorites
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.user_favorites;
CREATE POLICY "Users can insert their own favorites" ON public.user_favorites
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- 3. Update any functions that still reference user_id
-- This is a template - you may need to adjust based on your specific functions

-- Example: Update a function that references user_id
-- CREATE OR REPLACE FUNCTION some_function_name()
-- RETURNS void
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   -- Update any user_id references to profile_id here
-- END;
-- $$;

COMMIT; 