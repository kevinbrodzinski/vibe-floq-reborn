-- User @-mentions system for floq chat
-- Simple approach focusing on user mentions only

-- 1. Create message_mentions linking table
CREATE TABLE IF NOT EXISTS public.message_mentions (
  message_id     UUID REFERENCES public.floq_messages(id) ON DELETE CASCADE,
  mentioned_user UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pk_message_mentions PRIMARY KEY (message_id, mentioned_user)
);

-- 2. Enable RLS - writer & tagged user can see, writer only can write
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_mentions_read"
ON public.message_mentions
FOR SELECT
USING (
  auth.uid() = mentioned_user
  OR auth.uid() = (
    SELECT sender_id FROM public.floq_messages fm
    WHERE fm.id = message_id
  )
);

CREATE POLICY "message_mentions_write"
ON public.message_mentions
FOR INSERT 
WITH CHECK (
  auth.uid() = (
    SELECT sender_id FROM public.floq_messages fm
    WHERE fm.id = message_id
  )
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_mentions_user 
ON public.message_mentions(mentioned_user);

CREATE INDEX IF NOT EXISTS idx_message_mentions_message 
ON public.message_mentions(message_id);