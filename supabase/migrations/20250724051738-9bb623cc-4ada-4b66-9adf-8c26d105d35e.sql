-- Update plan_participants RLS policy to allow insert if user is in any linked floq
DROP POLICY IF EXISTS "insert participant" ON public.plan_participants;

CREATE POLICY "insert participant" ON public.plan_participants
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.plan_floqs f
      WHERE f.plan_id = plan_participants.plan_id
        AND user_is_member_of_floq(f.floq_id)
    )
  );