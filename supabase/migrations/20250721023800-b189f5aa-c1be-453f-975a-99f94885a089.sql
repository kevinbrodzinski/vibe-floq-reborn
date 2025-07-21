-- Create floq activity table for tracking plan events
CREATE TABLE IF NOT EXISTS public.floq_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id UUID NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.floq_plans(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  guest_name TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'edited', 'commented')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_floq_activity_floq_id ON public.floq_activity(floq_id);
CREATE INDEX IF NOT EXISTS idx_floq_activity_created_at ON public.floq_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.floq_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Floq members can see activity
CREATE POLICY "floq_activity_read" ON public.floq_activity FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.floq_participants fp
    WHERE fp.floq_id = floq_activity.floq_id 
    AND fp.user_id = auth.uid()
  )
);

-- RLS Policy: Authenticated users can insert activity
CREATE POLICY "floq_activity_insert" ON public.floq_activity FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_activity;