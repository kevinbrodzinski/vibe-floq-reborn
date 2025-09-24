-- Phase-1: Plan Structure Finalization & Stop-Grid Polish
----------------------------------------------------------

-- 1. ENUM for plan_mode (idempotent)
DO $$
BEGIN
  CREATE TYPE plan_mode AS ENUM ('draft','finalized','executing','completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Augment floq_plans
ALTER TABLE public.floq_plans
  ADD COLUMN IF NOT EXISTS plan_mode     plan_mode  NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS locked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by  uuid,
  ADD COLUMN IF NOT EXISTS plan_summary  text;

-- FK for finalized_by → users (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_floq_plans_finalized_by' 
    AND table_name = 'floq_plans'
  ) THEN
    ALTER TABLE public.floq_plans
      ADD CONSTRAINT fk_floq_plans_finalized_by
      FOREIGN KEY (finalized_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_floq_plans_mode
  ON public.floq_plans(plan_mode);

-- 3. Add sort_order + updated_at to plan_stops
ALTER TABLE public.plan_stops
  ADD COLUMN IF NOT EXISTS sort_order  int           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz   NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_sort
  ON public.plan_stops(plan_id, sort_order);

-- Realtime diffs for Supabase
ALTER TABLE public.plan_stops REPLICA IDENTITY FULL;

-- 4. Assertion helper (kept private)
CREATE OR REPLACE FUNCTION public.assert_plan_is_draft(_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM public.floq_plans
      WHERE id = _plan_id AND plan_mode = 'draft'
  ) THEN
    RAISE EXCEPTION 'Plan is locked and cannot be modified';
  END IF;
END;
$$;

-- 5. Drag-sort RPC
CREATE OR REPLACE FUNCTION public.reorder_plan_stops(
  _plan_id uuid,
  _ordered_stop_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  _stop_id uuid;
  idx      int := 1;
BEGIN
  PERFORM assert_plan_is_draft(_plan_id);

  IF NOT user_can_manage_plan(_plan_id) THEN
    RAISE EXCEPTION 'Access denied: cannot modify this plan';
  END IF;

  FOREACH _stop_id IN ARRAY _ordered_stop_ids LOOP
    UPDATE public.plan_stops
    SET sort_order = idx,
        updated_at = now()
    WHERE id = _stop_id
      AND plan_id = _plan_id;
    idx := idx + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_plan_stops(uuid, uuid[]) TO authenticated;

-- 6. RLS – draft-only edits
DROP POLICY IF EXISTS "Users can update their plan stops"  ON public.plan_stops;
CREATE POLICY "Users can update their plan stops"
  ON public.plan_stops
  FOR UPDATE
  USING (
    user_can_manage_plan(plan_id)
    AND (SELECT plan_mode FROM public.floq_plans p WHERE p.id = plan_id) = 'draft'
  );

DROP POLICY IF EXISTS "Users can delete their plan stops"  ON public.plan_stops;
CREATE POLICY "Users can delete their plan stops"
  ON public.plan_stops
  FOR DELETE
  USING (
    user_can_manage_plan(plan_id)
    AND (SELECT plan_mode FROM public.floq_plans p WHERE p.id = plan_id) = 'draft'
  );

DROP POLICY IF EXISTS "Users can create stops for their plans" ON public.plan_stops;
CREATE POLICY "Users can create stops for their plans"
  ON public.plan_stops
  FOR INSERT
  WITH CHECK (
    user_can_manage_plan(plan_id)
    AND (SELECT plan_mode FROM public.floq_plans p WHERE p.id = plan_id) = 'draft'
  );