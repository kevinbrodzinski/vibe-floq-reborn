-- Migration: Auto-Join Floq Creators - Ensures creators can see their own floqs
-- Addresses the "My Flocks" visibility issue by auto-adding creators to floq_participants

BEGIN;

-- 1. Auto-join creator function
CREATE OR REPLACE FUNCTION public.auto_join_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.floq_participants (user_id, floq_id, "role", joined_at)
  VALUES (NEW.creator_id, NEW.id, 'creator', now())
  ON CONFLICT (floq_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Create trigger to auto-join creators
DROP TRIGGER IF EXISTS trg_auto_join_creator ON public.floqs;
CREATE TRIGGER trg_auto_join_creator
AFTER INSERT ON public.floqs
FOR EACH ROW EXECUTE FUNCTION public.auto_join_creator();

-- 3. Back-fill existing floqs (idempotent & lock-friendly)
WITH missing AS (
  SELECT f.creator_id  AS user_id,
         f.id          AS floq_id,
         'creator'     AS "role",
         COALESCE(f.created_at, now()) AS joined_at
  FROM   public.floqs f
  WHERE  f.creator_id IS NOT NULL
    AND  f.deleted_at IS NULL
    AND  NOT EXISTS (
         SELECT 1
         FROM   public.floq_participants fp
         WHERE  fp.user_id = f.creator_id
           AND  fp.floq_id = f.id)
)
INSERT INTO public.floq_participants (user_id, floq_id, "role", joined_at)
SELECT * FROM missing
ON CONFLICT (floq_id, user_id) DO NOTHING;

COMMIT;