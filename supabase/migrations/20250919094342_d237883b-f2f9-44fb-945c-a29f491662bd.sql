-- Create floq_stream_reads table for unread watermarks
CREATE TABLE IF NOT EXISTS public.floq_stream_reads (
  floq_id uuid NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_ts timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (floq_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.floq_stream_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies: viewer can read/update only own watermark
CREATE POLICY "viewer read own watermark"
ON public.floq_stream_reads FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "viewer upsert own watermark"
ON public.floq_stream_reads FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "viewer update own watermark"
ON public.floq_stream_reads FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_fsr_floq ON public.floq_stream_reads(floq_id, profile_id);