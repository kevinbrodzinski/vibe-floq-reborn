-- Simplified RLS policies for floq_boosts
-- Edge function will use service key without Authorization header to bypass RLS

-- 0. Make sure RLS is on
ALTER TABLE public.floq_boosts ENABLE ROW LEVEL SECURITY;

-- 1. Clean slate
DROP POLICY IF EXISTS user_can_boost            ON public.floq_boosts;
DROP POLICY IF EXISTS user_can_unboost          ON public.floq_boosts;
DROP POLICY IF EXISTS active_boosts_visible     ON public.floq_boosts;
DROP POLICY IF EXISTS "boost: self_insert"      ON public.floq_boosts;
DROP POLICY IF EXISTS "boost: self_delete"      ON public.floq_boosts;
DROP POLICY IF EXISTS "boost: visible_active"   ON public.floq_boosts;

-- 2. Insert (boost) - only authenticated users can boost
CREATE POLICY user_can_boost
ON public.floq_boosts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Delete (un-boost) - users can remove their own boosts
CREATE POLICY user_can_unboost
ON public.floq_boosts
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Read - everyone can see active boosts
CREATE POLICY active_boosts_visible
ON public.floq_boosts
FOR SELECT
USING (expires_at > now());

-- 5. Realtime stream
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_boosts;