-- Add foreign key constraint from plan_participants.user_id to profiles.id
ALTER TABLE public.plan_participants 
ADD CONSTRAINT fk_plan_participants_user_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_plan_participants_user_id 
ON public.plan_participants(user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT fk_plan_participants_user_profile ON public.plan_participants 
IS 'Enables PostgREST embed for participant profiles';