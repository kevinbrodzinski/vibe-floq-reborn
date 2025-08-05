-- 🔒 wrap everything for safety
BEGIN;

-- 1) Make sure the enum exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'plan_status_enum'
  ) THEN
    CREATE TYPE plan_status_enum AS ENUM ('draft', 'finalized', 'executing', 'completed', 'archived');
  END IF;
END
$$;

-- 2) Add the missing value
ALTER TYPE plan_status_enum
ADD VALUE IF NOT EXISTS 'cancelled';

-- 3) (Optional) verify dependent columns still point to the same enum
-- No action required unless you want to set a NEW default that uses "cancelled".

COMMIT;