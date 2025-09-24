-- Migration: Auto-Join Floq Creators - Ensures creators can see their own floqs
-- Addresses the "My Flocks" visibility issue by auto-adding creators to floq_participants

BEGIN;

-- 1. Ensure primary key exists (safe, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'floq_participants_pk'
          AND conrelid = 'public.floq_participants'::regclass
  ) THEN
    -- De-duplicate any existing violations before creating PK
    DELETE FROM public.floq_participants fp1
    USING public.floq_participants fp2
    WHERE fp1.ctid < fp2.ctid
      AND fp1.floq_id = fp2.floq_id
      AND fp1.user_id = fp2.user_id;
    
    -- Create unique index first, then attach as primary key
    CREATE UNIQUE INDEX IF NOT EXISTS
      idx_floq_participants_uniq
      ON public.floq_participants(floq_id, user_id);

    ALTER TABLE public.floq_participants
      ADD CONSTRAINT floq_participants_pk
      PRIMARY KEY USING INDEX idx_floq_participants_uniq;
  END IF;
END$$;

-- 2. Auto-join creator function
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

-- 3. Create trigger to auto-join creators
DROP TRIGGER IF EXISTS trg_auto_join_creator ON public.floqs;
CREATE TRIGGER trg_auto_join_creator
AFTER INSERT ON public.floqs
FOR EACH ROW EXECUTE FUNCTION public.auto_join_creator();

-- 4. Back-fill existing floqs (idempotent & lock-friendly)
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

-- 5. Set function owner for RLS bypass
ALTER FUNCTION public.auto_join_creator() OWNER TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_join_creator() TO service_role;

COMMIT;