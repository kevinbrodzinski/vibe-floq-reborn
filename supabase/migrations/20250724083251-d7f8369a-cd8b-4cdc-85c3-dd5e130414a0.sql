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
-- 3.  "Can-insert" policy
---------------------------------------------------------------
DROP POLICY IF EXISTS plan_activities_insert ON public.plan_activities;

CREATE POLICY plan_activities_insert
  ON public.plan_activities
  FOR INSERT
  WITH CHECK (
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
-- 4.  "Can-update" policy
---------------------------------------------------------------
DROP POLICY IF EXISTS plan_activities_update ON public.plan_activities;

CREATE POLICY plan_activities_update
  ON public.plan_activities
  FOR UPDATE
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
  )
  WITH CHECK (
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