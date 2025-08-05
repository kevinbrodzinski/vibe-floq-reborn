-- Fix v_active_users table
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: Check the current structure of v_active_users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users'
ORDER BY ordinal_position;

-- Step 2: Add profile_id column to v_active_users
ALTER TABLE public.v_active_users ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Step 3: Update profile_id with data from user_id
-- This assumes user_id references auth.users(id) and we need to map to profiles(id)
UPDATE public.v_active_users 
SET profile_id = (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.user_id = v_active_users.user_id
)
WHERE profile_id IS NULL;

-- Step 4: Make profile_id NOT NULL after data is populated
ALTER TABLE public.v_active_users ALTER COLUMN profile_id SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE public.v_active_users 
ADD CONSTRAINT fk_v_active_users_profile_id 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 6: Now it's safe to drop user_id
ALTER TABLE public.v_active_users DROP COLUMN IF EXISTS user_id;

-- Step 7: Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users'
ORDER BY ordinal_position; 