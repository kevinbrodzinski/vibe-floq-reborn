-- Tighten friend_requests policies (fix 400 errors)

ALTER POLICY "Friends: mutual visibility"
  ON public.friend_requests
  USING ((user_id = auth.uid()) OR (friend_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()) OR (friend_id = auth.uid()));

COMMENT ON POLICY "Friends: mutual visibility"
  ON public.friend_requests
  IS 'Ensures callers only see or create rows in which they are participant.';

-- Done