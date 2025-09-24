-- Ensure plan_votes table has RLS enabled
ALTER TABLE public.plan_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Participants can vote" ON public.plan_votes;
DROP POLICY IF EXISTS "Participants can update votes" ON public.plan_votes;

-- Allow plan participants to insert new votes
CREATE POLICY "Participants can vote"
  ON public.plan_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_participants
      WHERE plan_participants.plan_id = plan_votes.plan_id
        AND plan_participants.user_id = auth.uid()
    )
  );

-- Allow participants to update their own votes
CREATE POLICY "Participants can update votes"
  ON public.plan_votes
  FOR UPDATE
  TO authenticated
  USING (
    plan_votes.user_id = auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.plan_participants
      WHERE plan_participants.plan_id = plan_votes.plan_id
        AND plan_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    plan_votes.user_id = auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.plan_participants
      WHERE plan_participants.plan_id = plan_votes.plan_id
        AND plan_participants.user_id = auth.uid()
    )
  );