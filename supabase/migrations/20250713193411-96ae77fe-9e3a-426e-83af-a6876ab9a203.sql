-- Drop the old redundant index (if it exists)
DROP INDEX IF EXISTS idx_floq_messages_floq_id_created_at;

-- Create the new composite index for better chat performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floq_messages_floq_created
ON public.floq_messages (floq_id, created_at DESC);