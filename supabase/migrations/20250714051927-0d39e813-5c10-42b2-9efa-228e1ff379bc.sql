-- Fix infinite recursion in floq_participants RLS policies

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "fp_creator_admin_modify" ON public.floq_participants;

-- Create a security definer function to check if user is creator/admin without RLS recursion
CREATE OR REPLACE FUNCTION public.check_floq_admin_role(p_floq_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.floq_participants fp
    WHERE fp.floq_id = p_floq_id 
      AND fp.user_id = COALESCE(p_user_id, auth.uid())
      AND fp.role IN ('creator', 'co-admin')
  );
$$;

-- Create a security definer function to check floq visibility without RLS recursion
CREATE OR REPLACE FUNCTION public.check_floq_visibility(p_floq_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT f.visibility
  FROM public.floqs f
  WHERE f.id = p_floq_id;
$$;

-- Recreate policies without recursion
CREATE POLICY "floq_participants_admin_modify"
ON public.floq_participants
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.check_floq_admin_role(floq_id)
)
WITH CHECK (
  user_id = auth.uid() OR 
  public.check_floq_admin_role(floq_id)
);

-- Policy for viewing participants in public floqs
CREATE POLICY "floq_participants_public_view"
ON public.floq_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.check_floq_visibility(floq_id) = 'public' OR
  public.check_floq_admin_role(floq_id)
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_floq_admin_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_floq_visibility TO authenticated;