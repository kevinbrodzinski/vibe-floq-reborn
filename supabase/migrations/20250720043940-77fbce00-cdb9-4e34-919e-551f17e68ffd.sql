-- Fix plan_participants table structure
-- Add missing id column as UUID with default but not primary key
ALTER TABLE public.plan_participants 
ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- Update existing rows to have proper IDs
UPDATE public.plan_participants SET id = gen_random_uuid() WHERE id IS NULL;

-- Make id NOT NULL 
ALTER TABLE public.plan_participants 
ALTER COLUMN id SET NOT NULL;

-- Add missing role column with proper enum type
ALTER TABLE public.plan_participants 
ADD COLUMN role plan_role_enum NOT NULL DEFAULT 'participant';

-- Add proper foreign key constraint for user_id -> profiles
ALTER TABLE public.plan_participants 
ADD CONSTRAINT plan_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add proper foreign key constraint for plan_id -> floq_plans  
ALTER TABLE public.plan_participants 
ADD CONSTRAINT plan_participants_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.floq_plans(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON public.plan_participants(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_user_id ON public.plan_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_id ON public.plan_participants(id);