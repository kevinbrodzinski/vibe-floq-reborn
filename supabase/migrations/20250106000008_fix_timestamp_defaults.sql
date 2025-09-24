-- ==============================================
-- Fix timestamp defaults and triggers to prevent "56 years ago" dates
-- ==============================================

-- Ensure direct_messages.created_at has proper default
ALTER TABLE direct_messages 
  ALTER COLUMN created_at SET DEFAULT NOW();

-- Ensure direct_threads timestamp columns have proper defaults
ALTER TABLE direct_threads 
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE direct_threads 
  ALTER COLUMN last_message_at SET DEFAULT NOW();

-- Create or replace trigger function to update last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE direct_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_thread_last_message_at ON direct_messages;

-- Create trigger to update last_message_at when new message is inserted
CREATE TRIGGER trigger_update_thread_last_message_at
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message_at();

-- Update any existing NULL timestamps to current time
UPDATE direct_messages 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE direct_threads 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE direct_threads 
SET last_message_at = NOW() 
WHERE last_message_at IS NULL;

-- Ensure dm_message_reactions also has proper timestamp default
ALTER TABLE dm_message_reactions 
  ALTER COLUMN created_at SET DEFAULT NOW();

UPDATE dm_message_reactions 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Add comment
COMMENT ON TRIGGER trigger_update_thread_last_message_at ON direct_messages 
IS 'Updates thread last_message_at timestamp when new messages are inserted';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';