BEGIN;

/* ---------------------------------------------------------------
   Fix floq_participants → profiles foreign key duplication
   • Remove duplicate constraint causing PGRST201 ambiguity
   • Keep only one properly named constraint
---------------------------------------------------------------- */

-- First, check what constraints actually exist
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'floq_participants'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name LIKE '%profile_id%';
    
    RAISE NOTICE 'Found % profile_id foreign key constraints on floq_participants', constraint_count;
END$$;

-- Drop the older/duplicate constraint if it exists
ALTER TABLE public.floq_participants 
  DROP CONSTRAINT IF EXISTS floq_participants_profile_id_fkey;

-- Drop the other potential duplicate if it exists  
ALTER TABLE public.floq_participants 
  DROP CONSTRAINT IF EXISTS fk_floq_participants_profile_id;

-- Recreate with a single, canonical constraint name
ALTER TABLE public.floq_participants
  ADD CONSTRAINT floq_participants_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Verify we now have exactly one constraint
DO $$
DECLARE
    final_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_count
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'floq_participants'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name LIKE '%profile_id%';
    
    IF final_count != 1 THEN
        RAISE EXCEPTION 'Expected exactly 1 profile_id FK constraint, found %', final_count;
    END IF;
    
    RAISE NOTICE 'Successfully fixed FK constraint - now have exactly 1';
END$$;

COMMIT;