-- 1. Add/update RLS policy for plan status updates (creator only)
DROP POLICY IF EXISTS plan_status_update_creator ON public.floq_plans;

CREATE POLICY plan_status_update_creator 
  ON public.floq_plans 
  FOR UPDATE 
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- 2. Ensure updated_at trigger is in place for floq_plans
-- (Assumes `update_updated_at_column()` already exists)
DROP TRIGGER IF EXISTS update_floq_plans_updated_at ON public.floq_plans;

CREATE TRIGGER update_floq_plans_updated_at
  BEFORE UPDATE ON public.floq_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Enforce unique user votes per stop in a plan
-- Prevents double-voting
CREATE UNIQUE INDEX IF NOT EXISTS plan_votes_unique_user_stop 
  ON public.plan_votes (plan_id, stop_id, user_id);

-- 4. Extend plan_status_enum safely with correct values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_status_enum') THEN
    CREATE TYPE plan_status_enum AS ENUM ('draft');  -- fallback
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'finalized' AND enumtypid = 'plan_status_enum'::regtype
  ) THEN
    ALTER TYPE plan_status_enum ADD VALUE 'finalized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'executing' AND enumtypid = 'plan_status_enum'::regtype
  ) THEN
    ALTER TYPE plan_status_enum ADD VALUE 'executing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'completed' AND enumtypid = 'plan_status_enum'::regtype
  ) THEN
    ALTER TYPE plan_status_enum ADD VALUE 'completed';
  END IF;
END $$;