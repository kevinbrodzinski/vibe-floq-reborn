-- Create enum for mode
CREATE TYPE summary_mode AS ENUM ('finalized', 'afterglow');

-- Create plan_summaries table
CREATE TABLE public.plan_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  mode summary_mode NOT NULL,
  summary TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, mode)
);

-- Create plan_feedback table
CREATE TABLE public.plan_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vibe_rating INTEGER CHECK (vibe_rating >= 1 AND vibe_rating <= 5),
  favorite_moment TEXT,
  would_repeat BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

-- Enable and force RLS
ALTER TABLE public.plan_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_summaries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.plan_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_feedback FORCE ROW LEVEL SECURITY;

-- RLS: plan_summaries
CREATE POLICY "Users can read summaries for plans they can access"
ON public.plan_summaries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = plan_summaries.plan_id AND fpar.user_id = auth.uid()
  )
);

CREATE POLICY "Plan creators/admins can manage summaries"
ON public.plan_summaries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = plan_summaries.plan_id 
      AND fpar.user_id = auth.uid()
      AND fpar.role IN ('creator', 'co-admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = plan_summaries.plan_id 
      AND fpar.user_id = auth.uid()
      AND fpar.role IN ('creator', 'co-admin')
  )
);

-- RLS: plan_feedback
CREATE POLICY "Users can manage their own feedback"
ON public.plan_feedback
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Plan participants can read all feedback for their plans"
ON public.plan_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = plan_feedback.plan_id AND fpar.user_id = auth.uid()
  )
);