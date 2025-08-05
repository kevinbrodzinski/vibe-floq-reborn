-- Tighten friend_requests policies (fix 400 errors)

-- Drop the existing policy and recreate with proper clauses
DROP POLICY IF EXISTS "Friends: mutual visibility" ON public.friend_requests;

-- Create separate policies for different operations
CREATE POLICY "Friends: read mutual requests"
  ON public.friend_requests
  FOR SELECT
  USING ((user_id = auth.uid()) OR (friend_id = auth.uid()));

CREATE POLICY "Friends: create own requests" 
  ON public.friend_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Friends: update mutual requests"
  ON public.friend_requests
  FOR UPDATE
  USING ((user_id = auth.uid()) OR (friend_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()) OR (friend_id = auth.uid()));

COMMENT ON POLICY "Friends: read mutual requests"
  ON public.friend_requests
  IS 'Users can see friend requests where they are sender or recipient.';

COMMENT ON POLICY "Friends: create own requests"
  ON public.friend_requests  
  IS 'Users can only create friend requests as the sender.';

COMMENT ON POLICY "Friends: update mutual requests"
  ON public.friend_requests
  IS 'Users can update friend requests where they are participant.';