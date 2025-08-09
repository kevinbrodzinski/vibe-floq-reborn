-- ==============================================
-- Add reply_to column to direct_messages table for inline replies
-- ==============================================

-- Add reply_to column to direct_messages table
-- This allows messages to reference other messages as replies
ALTER TABLE direct_messages 
ADD COLUMN reply_to uuid REFERENCES direct_messages(id) ON DELETE SET NULL;

-- Add index for performance when querying replies
CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to 
ON direct_messages(reply_to);

-- Add comment for documentation
COMMENT ON COLUMN direct_messages.reply_to 
IS 'References another message in the same thread that this message is replying to';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';