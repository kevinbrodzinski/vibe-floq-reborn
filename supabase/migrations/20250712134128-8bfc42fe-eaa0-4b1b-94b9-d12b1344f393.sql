-- Polished RLS policies for floq_boosts with service role support
-- This allows edge functions to work properly while maintaining user security

-- 0. Make sure RLS is on
ALTER TABLE public.floq_boosts ENABLE ROW LEVEL SECURITY;

-- 1. Clean slate
DROP POLICY IF EXISTS user_can_boost            ON public.floq_boosts;
DROP POLICY IF EXISTS user_can_unboost          ON public.floq_boosts;
DROP POLICY IF EXISTS active_boosts_visible     ON public.floq_boosts;
DROP POLICY IF EXISTS "boost: self_insert"      ON public.floq_boosts;
DROP POLICY IF EXISTS "boost: self_delete"      ON public.floq_boosts;
DROP POLICY IF EXISTS "boost: visible_active"   ON public.floq_boosts;

-- 2. Insert (boost)
CREATE POLICY user_can_boost
ON public.floq_boosts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id                -- normal logged-in user
  OR pgjwt.claim('role') = 'service_role'  -- edge function w/ service key
);

-- 3. Delete (un-boost / cleanup)
CREATE POLICY user_can_unboost
ON public.floq_boosts
FOR DELETE
USING (
  auth.uid() = user_id
  OR pgjwt.claim('role') = 'service_role'
);

-- 4. Read
CREATE POLICY active_boosts_visible
ON public.floq_boosts
FOR SELECT
USING (
  expires_at > now()
);

-- 5. Realtime stream
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_boosts;