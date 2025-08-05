-- Create helper function to check if user is member of floq
CREATE OR REPLACE FUNCTION public.user_is_member_of_floq(_floq_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.floq_participants
  WHERE floq_id = _floq_id AND user_id = auth.uid()
);
$$;

-- Create plan_floqs join table
CREATE TABLE IF NOT EXISTS public.plan_floqs (
  plan_id       uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  floq_id       uuid NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  auto_disband  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, floq_id)
);

-- Enable RLS
ALTER TABLE public.plan_floqs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- View if you can view plan OR you are member of the floq
CREATE POLICY "View linked floqs" ON public.plan_floqs
  FOR SELECT USING (
    user_can_access_plan(plan_id) OR user_is_member_of_floq(floq_id)
  );

-- Insert links: must manage plan AND be member/creator of floq
CREATE POLICY "Link floq to plan" ON public.plan_floqs
  FOR INSERT WITH CHECK (
    user_can_manage_plan(plan_id) AND (
      user_is_member_of_floq(floq_id) OR 
      (SELECT creator_id FROM public.floqs f WHERE f.id = floq_id) = auth.uid()
    )
  );

-- Update auto_disband toggle
CREATE POLICY "Update plan floq link" ON public.plan_floqs
  FOR UPDATE USING (user_can_manage_plan(plan_id))
  WITH CHECK (user_can_manage_plan(plan_id));

-- Delete link 
CREATE POLICY "Unlink floq from plan" ON public.plan_floqs
  FOR DELETE USING (user_can_manage_plan(plan_id));