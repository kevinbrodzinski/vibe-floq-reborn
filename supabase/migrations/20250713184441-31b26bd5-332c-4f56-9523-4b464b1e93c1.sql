-- Safe migration: Add 'creator' role to floq_participants
-- This migration is idempotent and handles existing data gracefully

-- 1. Add 'creator' to the enum **once**
DO $$
BEGIN
  -- only add if it isn't already there
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'participant_role_enum'
      AND e.enumlabel = 'creator'
  ) THEN
    ALTER TYPE participant_role_enum ADD VALUE 'creator';
  END IF;
END
$$;

-- 2. If (and only if) the column is still TEXT with a CHECK constraint, update it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'floq_participants'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    -- Drop old check if present
    ALTER TABLE floq_participants
      DROP CONSTRAINT IF EXISTS floq_participants_role_check;

    -- Re-add including 'creator'
    ALTER TABLE floq_participants
      ADD CONSTRAINT floq_participants_role_check
      CHECK (role IN ('member','admin','creator'));
  END IF;
END
$$;