-- RLS Policy for anonymous click tracking on plan_share_links
CREATE POLICY "Anyone can update click tracking" 
ON public.plan_share_links
FOR UPDATE
USING (true)
WITH CHECK (true);