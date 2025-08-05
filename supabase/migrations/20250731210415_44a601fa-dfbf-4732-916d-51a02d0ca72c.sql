-- Add REPLICA IDENTITY FULL for richer realtime payloads
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;