-- Create shortlist public tokens table
CREATE TABLE IF NOT EXISTS public.shortlist_public_tokens (
  token text PRIMARY KEY,
  shortlist_id uuid NOT NULL REFERENCES public.venue_shortlists(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL DEFAULT auth.uid(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shortlist_public_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies - owner can manage their own tokens
CREATE POLICY "token_select_own" ON public.shortlist_public_tokens
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "token_insert_own" ON public.shortlist_public_tokens
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "token_delete_own" ON public.shortlist_public_tokens
  FOR DELETE USING (auth.uid() = profile_id);