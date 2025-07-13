-- Enable realtime for floq_messages table
ALTER TABLE public.floq_messages REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_messages;