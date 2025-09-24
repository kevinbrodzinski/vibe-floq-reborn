-- Create plan_check_ins table
CREATE TABLE IF NOT EXISTS public.plan_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  location GEOGRAPHY(Point, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, stop_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkins_plan_id ON public.plan_check_ins(plan_id);
CREATE INDEX IF NOT EXISTS idx_checkins_stop_id ON public.plan_check_ins(stop_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.plan_check_ins(user_id);

-- Enable RLS
ALTER TABLE public.plan_check_ins ENABLE ROW LEVEL SECURITY;

-- View policy: participants of the plan can see all check-ins
CREATE POLICY "Users can view plan check-ins"
ON public.plan_check_ins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.plan_participants pp
    WHERE pp.plan_id = plan_check_ins.plan_id
    AND pp.user_id = auth.uid()
  )
);

-- Insert: only the user can insert their own check-in
CREATE POLICY "Users can insert their own check-in"
ON public.plan_check_ins
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update: only the user can update their check-in (e.g. to check out)
CREATE POLICY "Users can update their own check-in"
ON public.plan_check_ins
FOR UPDATE
USING (user_id = auth.uid());

-- Delete: only the user can delete their check-in
CREATE POLICY "Users can delete their own check-in"
ON public.plan_check_ins
FOR DELETE
USING (user_id = auth.uid());