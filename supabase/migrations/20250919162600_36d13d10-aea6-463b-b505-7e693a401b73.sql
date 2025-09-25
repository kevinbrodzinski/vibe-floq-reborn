-- Update existing group_predictability_log table to add profile_id and proper RLS
BEGIN;

-- Add missing columns to existing table
ALTER TABLE public.group_predictability_log 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS profile_id uuid;

-- Update profile_id to reference profiles table
UPDATE public.group_predictability_log 
SET profile_id = auth.uid() 
WHERE profile_id IS NULL;

-- Make profile_id NOT NULL and add foreign key
ALTER TABLE public.group_predictability_log 
ALTER COLUMN profile_id SET NOT NULL,
ADD CONSTRAINT fk_group_predictability_log_profile 
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add primary key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'group_predictability_log_pkey' 
    AND conrelid = 'public.group_predictability_log'::regclass
  ) THEN
    ALTER TABLE public.group_predictability_log ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gpl_profile_ts ON public.group_predictability_log(profile_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_gpl_group_ts   ON public.group_predictability_log(group_id, ts DESC);

-- Enable RLS
ALTER TABLE public.group_predictability_log ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (drop existing first)
DROP POLICY IF EXISTS "gpl_select_owner" ON public.group_predictability_log;
DROP POLICY IF EXISTS "gpl_insert_owner" ON public.group_predictability_log;
DROP POLICY IF EXISTS "gpl_delete_owner" ON public.group_predictability_log;

CREATE POLICY "gpl_select_owner"
ON public.group_predictability_log
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "gpl_insert_owner"
ON public.group_predictability_log
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "gpl_delete_owner"
ON public.group_predictability_log
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

COMMIT;