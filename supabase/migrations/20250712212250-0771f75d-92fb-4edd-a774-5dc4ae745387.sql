-- Enhanced demo direct messaging schema with optimizations

-- 1. Create demo.direct_threads with proper constraints and indexes
CREATE TABLE demo.direct_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_a UUID NOT NULL,
  member_b UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_read_at_a TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at_b TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Uniqueness constraint to prevent duplicate threads
  CONSTRAINT direct_threads_unique_pair UNIQUE (LEAST(member_a, member_b), GREATEST(member_a, member_b)),
  
  -- Foreign keys to demo.profiles if they exist
  CONSTRAINT fk_member_a FOREIGN KEY (member_a) REFERENCES demo.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_member_b FOREIGN KEY (member_b) REFERENCES demo.profiles(id) ON DELETE CASCADE
);

-- 2. Create demo.direct_messages with proper constraints and indexes
CREATE TABLE demo.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB,
  
  -- Foreign key with cascade delete
  CONSTRAINT fk_thread FOREIGN KEY (thread_id) REFERENCES demo.direct_threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES demo.profiles(id) ON DELETE CASCADE
);

-- 3. Create optimized indexes
CREATE INDEX demo_threads_member_idx ON demo.direct_threads (member_a, member_b);
CREATE INDEX demo_messages_thread_created_idx ON demo.direct_messages (thread_id, created_at DESC);

-- 4. Create trigger function for automatic last_message_at updates
CREATE OR REPLACE FUNCTION demo.bump_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE demo.direct_threads 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
CREATE TRIGGER trg_bump_last_message
  AFTER INSERT ON demo.direct_messages
  FOR EACH ROW 
  EXECUTE FUNCTION demo.bump_thread_timestamp();

-- 6. Enable Row Level Security
ALTER TABLE demo.direct_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.direct_messages ENABLE ROW LEVEL SECURITY;

-- 7. Optimized RLS policies for demo.direct_threads
CREATE POLICY "demo_threads_members_read" 
  ON demo.direct_threads 
  FOR SELECT 
  USING (auth.uid() IN (member_a, member_b));

CREATE POLICY "demo_threads_members_create" 
  ON demo.direct_threads 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (member_a, member_b));

CREATE POLICY "demo_threads_update_read_status" 
  ON demo.direct_threads 
  FOR UPDATE 
  USING (auth.uid() IN (member_a, member_b))
  WITH CHECK (true); -- Rely on trigger for proper column updates

-- 8. Optimized RLS policies for demo.direct_messages  
CREATE POLICY "demo_messages_members_read" 
  ON demo.direct_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM demo.direct_threads t
      WHERE t.id = thread_id 
        AND auth.uid() IN (t.member_a, t.member_b)
      LIMIT 1
    )
  );

CREATE POLICY "demo_messages_members_send" 
  ON demo.direct_messages 
  FOR INSERT 
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM demo.direct_threads t
      WHERE t.id = thread_id 
        AND auth.uid() IN (t.member_a, t.member_b)
      LIMIT 1
    )
  );

-- 9. Grant permissions - authenticated users get full access, anon gets read-only
GRANT SELECT ON demo.direct_threads TO anon, authenticated;
GRANT SELECT ON demo.direct_messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON demo.direct_threads TO authenticated;
GRANT INSERT, UPDATE, DELETE ON demo.direct_messages TO authenticated;

-- 10. Add to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE demo.direct_threads, demo.direct_messages;