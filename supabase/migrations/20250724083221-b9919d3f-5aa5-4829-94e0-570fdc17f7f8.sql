-- ──────────────────────────────────────────────────────────────
-- plan_activities RLS hardening  (Phase-2 alignment)
--   • Ensures RLS is on
--   • Grants FULL access to the internal service-role
--   • Grants read / write to plan creator + participants
--   • Remains 100 % idempotent – safe to re-run
-- ──────────────────────────────────────────────────────────────

---------------------------------------------------------------
-- 0.  Make sure RLS is enabled on the table
---------------------------------------------------------------
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------
-- 1.  SERVICE-ROLE catch-all policy
--     (uses role membership, not SESSION setting)
---------------------------------------------------------------
DROP POLICY IF EXISTS plan_activities_service_full ON public.plan_activities;

CREATE POLICY plan_activities_service_full
  ON public.plan_activities
  FOR ALL
  TO service_role                    -- **only** the built-in service role
  USING (true)
  WITH CHECK (true);                 -- allow insert / update as well

---------------------------------------------------------------
-- 2.  "Can-view" policy for creator & participants
---------------------------------------------------------------
DROP POLICY IF EXISTS plan_activities_access ON public.plan_activities;

CREATE POLICY plan_activities_access
  ON public.plan_activities
  FOR SELECT
  USING (
        /* plan creator */
        EXISTS (
          SELECT 1
          FROM public.floq_plans fp
          WHERE fp.id = plan_activities.plan_id
            AND fp.creator_id = auth.uid()
        )
        OR
        /* invited / admitted participants */
        EXISTS (
          SELECT 1
          FROM public.plan_participants pp
          WHERE pp.plan_id = plan_activities.plan_id
            AND pp.user_id = auth.uid()
        )
  );

---------------------------------------------------------------
-- 3.  "Can-write" policy (insert + update)
---------------------------------------------------------------
DROP POLICY IF EXISTS plan_activities_write ON public.plan_activities;

CREATE POLICY plan_activities_write
  ON public.plan_activities
  FOR INSERT, UPDATE
  USING (
        /* same predicate as SELECT */
        EXISTS (
          SELECT 1
          FROM public.floq_plans fp
          WHERE fp.id = plan_activities.plan_id
            AND fp.creator_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1
          FROM public.plan_participants pp
          WHERE pp.plan_id = plan_activities.plan_id
            AND pp.user_id = auth.uid()
        )
  )
  WITH CHECK (                      -- must also hold true for NEW row
        EXISTS (
          SELECT 1
          FROM public.floq_plans fp
          WHERE fp.id = plan_activities.plan_id
            AND fp.creator_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1
          FROM public.plan_participants pp
          WHERE pp.plan_id = plan_activities.plan_id
            AND pp.user_id = auth.uid()
        )
  );