-- Add RLS policy for plan creators and co-admins to invite users
-- This ensures only authorized users can send plan invitations

-- First, create a function to check if user can manage plan invitations
CREATE OR REPLACE FUNCTION public.user_can_invite_to_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Check if user is the plan creator
  SELECT EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = p_plan_id AND fp.creator_id = auth.uid()
  ) OR EXISTS (
    -- Check if user is a co-admin of the floq associated with the plan
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan_id 
      AND fpar.user_id = auth.uid() 
      AND fpar.role IN ('creator', 'co-admin')
  );
$$;

-- Add policy for plan_participants table to allow invitations
-- This assumes plan_participants table is used for tracking RSVPs
DROP POLICY IF EXISTS "plan_participants_invite_access" ON public.plan_participants;

CREATE POLICY "plan_participants_invite_access"
ON public.plan_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can invite others if they can manage the plan
  public.user_can_invite_to_plan(plan_id)
);

-- Also add a policy for reading plan participants (if not exists)
DROP POLICY IF EXISTS "plan_participants_read_access" ON public.plan_participants;

CREATE POLICY "plan_participants_read_access"
ON public.plan_participants
FOR SELECT
TO authenticated
USING (
  -- Users can see participants if they have plan access
  public.user_has_plan_access(plan_id)
);