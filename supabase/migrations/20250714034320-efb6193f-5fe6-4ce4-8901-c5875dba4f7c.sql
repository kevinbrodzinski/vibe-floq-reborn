-- Migration: Fix Floq Creator Visibility with Minor Adjustments
-- Ensures creators can see their own floqs through RLS and auto-participation

BEGIN;

-- 0. Safety: ensure RLS is on
ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floq_participants ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy (idempotent)
CREATE POLICY IF NOT EXISTS floqs_creator_or_participant_select
ON public.floqs FOR SELECT
USING ( 
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.floq_participants fp
    WHERE fp.floq_id = id AND fp.user_id = auth.uid()
  ) 
);

-- 2. Trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_floq_creator_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.floq_participants (floq_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'creator', now())
  ON CONFLICT (floq_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Trigger (drop and recreate for clean state)
DROP TRIGGER IF EXISTS trg_floq_creator_participant ON public.floqs;
CREATE TRIGGER trg_floq_creator_participant
AFTER INSERT ON public.floqs
FOR EACH ROW EXECUTE FUNCTION public.handle_floq_creator_participant();

-- 4. Back-fill existing floqs (lock for safety)
LOCK TABLE public.floq_participants IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.floq_participants (floq_id, user_id, role, joined_at)
SELECT f.id, f.creator_id, 'creator', COALESCE(f.created_at, now())
FROM   public.floqs f
WHERE  f.creator_id IS NOT NULL
  AND  NOT EXISTS (
    SELECT 1 FROM public.floq_participants fp
    WHERE fp.floq_id = f.id AND fp.user_id = f.creator_id
  );

-- 5. Optimized index for RLS policy
CREATE INDEX IF NOT EXISTS idx_fp_floq_user
ON public.floq_participants (floq_id, user_id);

COMMIT;