-- Address remaining RLS disabled tables with correct column names

-- Enable RLS for remaining tables that don't have it
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_floqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_encounter ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friendships table
DROP POLICY IF EXISTS "friendships_read" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;

CREATE POLICY "friendships_read" 
ON public.friendships 
FOR SELECT 
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friendships_insert" 
ON public.friendships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create RLS policies for friends table
DROP POLICY IF EXISTS "friends_read" ON public.friends;
DROP POLICY IF EXISTS "friends_insert" ON public.friends;

CREATE POLICY "friends_read" 
ON public.friends 
FOR SELECT 
USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "friends_insert" 
ON public.friends 
FOR INSERT 
WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- Create RLS policies for friend_requests table
DROP POLICY IF EXISTS "friend_requests_read" ON public.friend_requests;
DROP POLICY IF EXISTS "friend_requests_insert" ON public.friend_requests;
DROP POLICY IF EXISTS "friend_requests_update" ON public.friend_requests;

CREATE POLICY "friend_requests_read" 
ON public.friend_requests 
FOR SELECT 
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_requests_insert" 
ON public.friend_requests 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "friend_requests_update" 
ON public.friend_requests 
FOR UPDATE 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Create RLS policies for plan_invitations table
DROP POLICY IF EXISTS "plan_invitations_read" ON public.plan_invitations;
DROP POLICY IF EXISTS "plan_invitations_insert" ON public.plan_invitations;
DROP POLICY IF EXISTS "plan_invitations_update" ON public.plan_invitations;

CREATE POLICY "plan_invitations_read" 
ON public.plan_invitations 
FOR SELECT 
USING (
  inviter_id = auth.uid() OR 
  invitee_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM floq_plans fp 
    WHERE fp.id = plan_invitations.plan_id 
    AND fp.creator_id = auth.uid()
  )
);

CREATE POLICY "plan_invitations_insert" 
ON public.plan_invitations 
FOR INSERT 
WITH CHECK (
  inviter_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM plan_participants pp 
    WHERE pp.plan_id = plan_invitations.plan_id 
    AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "plan_invitations_update" 
ON public.plan_invitations 
FOR UPDATE 
USING (invitee_user_id = auth.uid());

-- Create RLS policies for plan_votes table
DROP POLICY IF EXISTS "plan_votes_read" ON public.plan_votes;
DROP POLICY IF EXISTS "plan_votes_insert" ON public.plan_votes;
DROP POLICY IF EXISTS "plan_votes_update" ON public.plan_votes;

CREATE POLICY "plan_votes_read" 
ON public.plan_votes 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM plan_participants pp 
    WHERE pp.plan_id = plan_votes.plan_id 
    AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "plan_votes_insert" 
ON public.plan_votes 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM plan_participants pp 
    WHERE pp.plan_id = plan_votes.plan_id 
    AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "plan_votes_update" 
ON public.plan_votes 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create RLS policies for plan_floqs table
DROP POLICY IF EXISTS "plan_floqs_read" ON public.plan_floqs;
DROP POLICY IF EXISTS "plan_floqs_insert" ON public.plan_floqs;

CREATE POLICY "plan_floqs_read" 
ON public.plan_floqs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM plan_participants pp 
    WHERE pp.plan_id = plan_floqs.plan_id 
    AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "plan_floqs_insert" 
ON public.plan_floqs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM floq_plans fp 
    WHERE fp.id = plan_floqs.plan_id 
    AND fp.creator_id = auth.uid()
  )
);

-- Create RLS policies for user_encounter table
DROP POLICY IF EXISTS "user_encounter_read" ON public.user_encounter;

CREATE POLICY "user_encounter_read" 
ON public.user_encounter 
FOR SELECT 
USING (user_a = auth.uid() OR user_b = auth.uid());