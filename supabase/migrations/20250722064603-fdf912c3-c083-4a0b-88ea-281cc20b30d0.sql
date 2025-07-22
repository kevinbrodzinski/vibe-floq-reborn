-- Add composite index for floq_messages query performance
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_created 
ON public.floq_messages (floq_id, created_at DESC);