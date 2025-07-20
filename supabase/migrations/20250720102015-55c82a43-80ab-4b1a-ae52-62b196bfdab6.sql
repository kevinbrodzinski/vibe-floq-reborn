-- Add guest support to plan_participants table
ALTER TABLE public.plan_participants
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_name TEXT DEFAULT NULL,
ADD CONSTRAINT guest_name_check CHECK (
  is_guest = true OR guest_name IS NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_participants_is_guest ON public.plan_participants(is_guest);