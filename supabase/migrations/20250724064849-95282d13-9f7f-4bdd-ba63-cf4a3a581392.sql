-- Add archived_at column to floqs table for better state management
-- This allows for archiving floqs without hard deleting them

-- 1. Add archived_at column (safe & idempotent)
DO $$
BEGIN
  ALTER TABLE public.floqs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END$$;

-- 2. Add partial index for performance (only indexes non-null values)
CREATE INDEX IF NOT EXISTS idx_floqs_archived_at
  ON public.floqs(archived_at)
  WHERE archived_at IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.floqs.archived_at IS 
  'Timestamp when floq was archived. NULL means active, non-NULL means archived but not deleted.';