-- Create rally threads and messages tables for Rally Inbox system
CREATE TABLE IF NOT EXISTS public.rally_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id TEXT NOT NULL,
  title TEXT NOT NULL,
  participants TEXT[] NOT NULL,
  centroid JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rally_threads ENABLE ROW LEVEL SECURITY;

-- RLS policies for rally_threads
CREATE POLICY "rally_threads_participant_access" ON public.rally_threads
  FOR ALL USING (auth.uid()::text = ANY(participants));

CREATE TABLE IF NOT EXISTS public.rally_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.rally_threads(id) ON DELETE CASCADE,
  sender_id TEXT,
  kind TEXT NOT NULL DEFAULT 'system',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rally_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for rally_messages
CREATE POLICY "rally_messages_thread_access" ON public.rally_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rally_threads rt 
      WHERE rt.id = rally_messages.thread_id 
      AND auth.uid()::text = ANY(rt.participants)
    )
  );

-- Add unique constraint for rally invites to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_rally_invites_unique
  ON public.rally_invites(rally_id, to_profile);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_rallies_creator_time ON public.rallies(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rallies_expires ON public.rallies(expires_at);
CREATE INDEX IF NOT EXISTS idx_invites_rally ON public.rally_invites(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_threads_rally ON public.rally_threads(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_thread ON public.rally_messages(thread_id, created_at DESC);