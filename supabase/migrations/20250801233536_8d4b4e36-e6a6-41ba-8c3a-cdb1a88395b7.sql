-- Phase 1: Fix Realtime Configuration for Afterglow Tables
-- Add replica identity and enable realtime for all afterglow-related tables

-- Set replica identity to FULL for complete row data in realtime updates
ALTER TABLE public.daily_afterglow REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_moments REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_venues REPLICA IDENTITY FULL;
ALTER TABLE public.afterglow_people REPLICA IDENTITY FULL;
ALTER TABLE public.venue_visits REPLICA IDENTITY FULL;
ALTER TABLE public.venue_stays REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication (using IF NOT EXISTS equivalent)
-- First check which tables are not already in the publication
DO $$
BEGIN
  -- Add tables that aren't already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'afterglow_moments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_moments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'afterglow_venues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_venues;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'afterglow_people'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.afterglow_people;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'venue_visits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_visits;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'venue_stays'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_stays;
  END IF;
END $$;