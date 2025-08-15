-- Create stop voting table
CREATE TABLE IF NOT EXISTS public.stop_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stop_id, user_id)
);

-- Create stop comments table
CREATE TABLE IF NOT EXISTS public.stop_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.stop_comments(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stop_votes_stop_id ON public.stop_votes(stop_id);
CREATE INDEX IF NOT EXISTS idx_stop_votes_user_id ON public.stop_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_stop_comments_stop_id ON public.stop_comments(stop_id);
CREATE INDEX IF NOT EXISTS idx_stop_comments_user_id ON public.stop_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_stop_comments_parent_id ON public.stop_comments(parent_id);

-- Enable RLS
ALTER TABLE public.stop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stop_votes
CREATE POLICY "Users can view all stop votes" ON public.stop_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON public.stop_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.stop_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.stop_votes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for stop_comments
CREATE POLICY "Users can view all stop comments" ON public.stop_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON public.stop_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.stop_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.stop_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_stop_votes_updated_at
  BEFORE UPDATE ON public.stop_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_stop_comments_updated_at
  BEFORE UPDATE ON public.stop_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();