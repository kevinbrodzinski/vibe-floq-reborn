-- Phase 1: Fix Realtime Configuration for Afterglow Tables
-- Add replica identity and enable realtime for all afterglow-related tables

-- Set replica identity to FULL for complete row data in realtime updates
ALTER TABLE public.daily_afterglow REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_moments REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_venues REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_people REPLICA IDENTITY FULL;
ALTER TABLE public.venue_visits REPLICA IDENTITY FULL;
ALTER TABLE public.venue_stays REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for realtime functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_afterglow;
ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_moments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_venues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_people;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_stays;