-- Safe migration: Add 'creator' role support to floq_participants
-- Handle both enum and text with CHECK constraint scenarios

DO $$
BEGIN
  -- Check if we have a text column with CHECK constraint
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'floq_participants'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    -- Drop old check constraint if present
    ALTER TABLE floq_participants
      DROP CONSTRAINT IF EXISTS floq_participants_role_check;

    -- Add new constraint including 'creator'
    ALTER TABLE floq_participants
      ADD CONSTRAINT floq_participants_role_check
      CHECK (role IN ('member','admin','creator'));
      
    RAISE NOTICE 'Updated text column CHECK constraint to include creator role';
  ELSE
    RAISE NOTICE 'Role column is not text type or does not exist';
  END IF;
END
$$;