-- Enable real-time functionality for afterglow tables
ALTER TABLE public.daily_afterglow REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_moments REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_afterglow;
ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_moments;