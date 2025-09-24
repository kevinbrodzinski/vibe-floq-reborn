-- Step 2: Complete the mention system setup
-- Create unique index on venues slug
CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_key ON public.venues(slug);

-- Ensure mention_target enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mention_target') THEN
        CREATE TYPE public.mention_target AS ENUM ('user','venue','plan');
    END IF;
END $$;

-- Helper function for slug to ID lookup
CREATE OR REPLACE FUNCTION public.slug_to_id(tag text, t mention_target)
RETURNS uuid
LANGUAGE sql STABLE AS
$$
SELECT CASE t
 WHEN 'user'  THEN (SELECT id FROM public.profiles WHERE username = tag)
 WHEN 'venue' THEN (SELECT id FROM public.venues  WHERE slug     = tag)
 WHEN 'plan'  THEN (SELECT id FROM public.floq_plans WHERE id::text = tag)
END;
$$;

-- Drop old mention tables if they exist
DROP TABLE IF EXISTS public.floq_message_mentions;
DROP TABLE IF EXISTS public.message_mentions;

-- Create improved mention table with composite PK
CREATE TABLE public.floq_message_mentions (
  message_id  UUID           NOT NULL REFERENCES public.floq_messages(id) ON DELETE CASCADE,
  target_type mention_target NOT NULL,
  target_id   UUID           NOT NULL,
  start_idx   INTEGER        NOT NULL,
  end_idx     INTEGER        NOT NULL,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  CONSTRAINT pk_fmm PRIMARY KEY (message_id, target_type, target_id)
);

-- Enable RLS and create policies
ALTER TABLE public.floq_message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fmm_read" ON public.floq_message_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.floq_messages m
      JOIN public.floq_participants fp ON fp.floq_id = m.floq_id
      WHERE m.id = floq_message_mentions.message_id
        AND fp.user_id = auth.uid()
    )
);

-- Only allow trigger inserts
CREATE POLICY "fmm_no_write" ON public.floq_message_mentions
  FOR INSERT WITH CHECK (false);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_fmm_msg ON public.floq_message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_fmm_tgt ON public.floq_message_mentions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_created ON public.floq_messages(floq_id, created_at DESC);