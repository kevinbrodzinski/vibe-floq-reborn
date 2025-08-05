
-- Add RLS policy to allow plan creators to invite users (not just guests)
CREATE POLICY "plan_participants_creator_can_invite_users" 
ON public.plan_participants
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = plan_participants.plan_id
      AND fp.creator_id = auth.uid()
  )
  AND (
    user_id = auth.uid() OR  -- user can add themselves
    is_guest = true OR       -- existing guest policy
    (is_guest = false AND user_id IS NOT NULL)  -- creator can add other users
  )
);

-- Create index for faster user search
CREATE INDEX IF NOT EXISTS idx_profiles_search 
ON public.profiles USING gin (
  to_tsvector('english', coalesce(display_name, '') || ' ' || coalesce(username, ''))
);
