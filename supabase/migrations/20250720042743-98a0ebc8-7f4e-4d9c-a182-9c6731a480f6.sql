
-- Create plan_participants table with enhanced safety and future-proofing

-- 1. Create enum for role (better than CHECK constraint)
CREATE TYPE plan_role_enum AS ENUM ('participant', 'organizer');

-- 2. Create the table with proper constraints
CREATE TABLE public.plan_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role plan_role_enum NOT NULL DEFAULT 'participant',
  added_by UUID REFERENCES auth.users(id), -- Track who added whom for future analytics
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate participation
  UNIQUE(plan_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX idx_plan_participants_plan_id ON public.plan_participants(plan_id);
CREATE INDEX idx_plan_participants_user_id ON public.plan_participants(user_id);
CREATE INDEX idx_plan_participants_added_by ON public.plan_participants(added_by);

-- 4. Enable RLS
ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies with improved clarity using aliased JOINs

-- Read: Users can see participants of plans they have access to
CREATE POLICY "plan_participants_read" 
ON public.plan_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.floq_plans AS fp
    JOIN public.floq_participants AS fpn ON fpn.floq_id = fp.floq_id
    WHERE fp.id = plan_participants.plan_id 
    AND fpn.user_id = auth.uid()
  )
);

-- Insert: Users can join plans if they're floq members
CREATE POLICY "plan_participants_insert" 
ON public.plan_participants 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.floq_plans AS fp
    JOIN public.floq_participants AS fpn ON fpn.floq_id = fp.floq_id
    WHERE fp.id = plan_participants.plan_id 
    AND fpn.user_id = auth.uid()
  )
);

-- Delete: Users can leave plans they've joined
CREATE POLICY "plan_participants_delete" 
ON public.plan_participants 
FOR DELETE 
USING (user_id = auth.uid());

-- Update: Plan creators can promote/demote participants (future-proofing)
CREATE POLICY "plan_participants_update" 
ON public.plan_participants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.floq_plans AS fp 
    WHERE fp.id = plan_participants.plan_id 
    AND fp.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.floq_plans AS fp 
    WHERE fp.id = plan_participants.plan_id 
    AND fp.creator_id = auth.uid()
  )
);

-- 6. Add helpful comments
COMMENT ON TABLE public.plan_participants IS 'Tracks participation in collaborative plans within floqs';
COMMENT ON COLUMN public.plan_participants.added_by IS 'Tracks who invited this participant for future analytics';
COMMENT ON CONSTRAINT plan_participants_plan_id_user_id_key ON public.plan_participants IS 'Prevents duplicate participation in same plan';
