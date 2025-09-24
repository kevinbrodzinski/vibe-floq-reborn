-- Create the enum type first if it doesn't exist
DO $$ BEGIN
    CREATE TYPE plan_role_enum AS ENUM ('participant', 'organizer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Fix plan_participants table structure
-- Add missing id column as UUID with default
ALTER TABLE public.plan_participants 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Update existing rows to have proper IDs
UPDATE public.plan_participants SET id = gen_random_uuid() WHERE id IS NULL;

-- Make id NOT NULL 
ALTER TABLE public.plan_participants 
ALTER COLUMN id SET NOT NULL;

-- Add missing role column with proper enum type
ALTER TABLE public.plan_participants 
ADD COLUMN IF NOT EXISTS role plan_role_enum NOT NULL DEFAULT 'participant';

-- Add proper foreign key constraint for user_id -> profiles (only if not exists)
DO $$ BEGIN
    ALTER TABLE public.plan_participants 
    ADD CONSTRAINT plan_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add proper foreign key constraint for plan_id -> floq_plans (only if not exists)
DO $$ BEGIN
    ALTER TABLE public.plan_participants 
    ADD CONSTRAINT plan_participants_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES public.floq_plans(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON public.plan_participants(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_user_id ON public.plan_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_id ON public.plan_participants(id);