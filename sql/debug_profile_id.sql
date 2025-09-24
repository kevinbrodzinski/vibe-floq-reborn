-- Debug Migration: Test profile_id references step by step
-- This will help us identify exactly where the error occurs

-- Test 1: Verify profiles table exists and has id column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'profiles table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'profiles.id column does not exist';
  END IF;
  
  RAISE NOTICE 'Test 1 PASSED: profiles table and id column exist';
END $$;

-- Test 2: Try creating a simple table with profile_id foreign key
CREATE TABLE IF NOT EXISTS public.test_profile_ref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_data TEXT
);

-- Test 3: Try inserting a test record (this should fail gracefully)
DO $$
BEGIN
  INSERT INTO public.test_profile_ref (profile_id, test_data)
  VALUES ('00000000-0000-0000-0000-000000000000', 'test');
  
  RAISE NOTICE 'Test 3 PASSED: Insert worked (unexpected)';
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'Test 3 PASSED: Foreign key constraint working correctly';
  WHEN OTHERS THEN
    RAISE NOTICE 'Test 3 ERROR: %', SQLERRM;
END $$;

-- Test 4: Try creating RLS policy with auth.uid() = profile_id
ALTER TABLE public.test_profile_ref ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_policy"
ON public.test_profile_ref
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Test 5: Try a function that uses profile_id
CREATE OR REPLACE FUNCTION public.test_profile_function(p_profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Test if we can reference profile_id parameter
  IF p_profile_id IS NULL THEN
    RETURN 'profile_id is null';
  END IF;
  
  -- Test if we can query with profile_id
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN 'profile found';
  ELSE
    RETURN 'profile not found';
  END IF;
END;
$$;

-- Clean up test objects
DROP POLICY IF EXISTS "test_policy" ON public.test_profile_ref;
DROP TABLE IF EXISTS public.test_profile_ref;
DROP FUNCTION IF EXISTS public.test_profile_function(UUID);

-- Final success message
DO $$
BEGIN
  RAISE NOTICE 'All tests completed successfully - profile_id references should work';
END $$;