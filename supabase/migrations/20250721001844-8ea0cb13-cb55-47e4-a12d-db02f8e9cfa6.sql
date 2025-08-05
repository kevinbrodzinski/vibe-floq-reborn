-- Create plan_stop_comments table
CREATE TABLE IF NOT EXISTS public.plan_stop_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id text,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  )
);

-- Create plan_stop_votes table
CREATE TABLE IF NOT EXISTS public.plan_stop_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id text,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'maybe')),
  emoji_reaction text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL)
  )
);

-- Partial unique indexes for vote uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_stop_votes_user 
ON public.plan_stop_votes (plan_id, stop_id, user_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_stop_votes_guest 
ON public.plan_stop_votes (plan_id, stop_id, guest_id) 
WHERE guest_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_plan_stop_comments_plan_stop 
ON public.plan_stop_comments(plan_id, stop_id);

CREATE INDEX IF NOT EXISTS idx_plan_stop_votes_plan_stop 
ON public.plan_stop_votes(plan_id, stop_id);

-- Enable RLS
ALTER TABLE public.plan_stop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_stop_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS plan_stop_comments_select ON public.plan_stop_comments;
DROP POLICY IF EXISTS plan_stop_comments_insert ON public.plan_stop_comments;
DROP POLICY IF EXISTS plan_stop_votes_select ON public.plan_stop_votes;
DROP POLICY IF EXISTS plan_stop_votes_upsert ON public.plan_stop_votes;

-- RLS policies for plan_stop_comments
CREATE POLICY plan_stop_comments_select
ON public.plan_stop_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floq_participants fp
    JOIN public.floq_plans fpl ON fp.floq_id = fpl.floq_id
    WHERE fpl.id = plan_stop_comments.plan_id 
    AND fp.user_id = auth.uid()
  )
);

CREATE POLICY plan_stop_comments_insert
ON public.plan_stop_comments FOR INSERT
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      JOIN public.floq_plans fpl ON fp.floq_id = fpl.floq_id
      WHERE fpl.id = plan_stop_comments.plan_id 
      AND fp.user_id = auth.uid()
    )
  )
  OR user_id IS NULL
);

-- RLS policies for plan_stop_votes
CREATE POLICY plan_stop_votes_select
ON public.plan_stop_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floq_participants fp
    JOIN public.floq_plans fpl ON fp.floq_id = fpl.floq_id
    WHERE fpl.id = plan_stop_votes.plan_id 
    AND fp.user_id = auth.uid()
  )
);

CREATE POLICY plan_stop_votes_upsert
ON public.plan_stop_votes FOR ALL
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      JOIN public.floq_plans fpl ON fp.floq_id = fpl.floq_id
      WHERE fpl.id = plan_stop_votes.plan_id 
      AND fp.user_id = auth.uid()
    )
  )
  OR user_id IS NULL
);

-- Realtime sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_stop_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_stop_votes;