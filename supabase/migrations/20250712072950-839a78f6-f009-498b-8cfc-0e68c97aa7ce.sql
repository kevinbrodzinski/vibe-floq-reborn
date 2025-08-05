-- Phase 1A: Critical Database Schema Fixes for Hardened Boost System (Fixed)

-- Drop and recreate floq_boosts table with proper constraints
DROP TABLE IF EXISTS public.floq_boosts CASCADE;

CREATE TABLE public.floq_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floq_id uuid NOT NULL,
  user_id uuid NOT NULL,
  boost_type text NOT NULL DEFAULT 'vibe',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  
  -- Foreign key constraints with CASCADE DELETE
  CONSTRAINT fk_floq_boosts_floq 
    FOREIGN KEY (floq_id) REFERENCES public.floqs(id) ON DELETE CASCADE,
  CONSTRAINT fk_floq_boosts_user 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    
  -- Simple unique constraint without time predicate (race-condition safe)
  CONSTRAINT uq_floq_boost_active 
    UNIQUE (floq_id, user_id, boost_type)
);

-- Performance indexes (without time predicates to avoid immutable function issues)
CREATE INDEX idx_floq_boosts_count 
  ON public.floq_boosts (floq_id, expires_at);

CREATE INDEX idx_floq_boosts_cleanup 
  ON public.floq_boosts (expires_at);

CREATE INDEX idx_floq_boosts_user_rate_limit 
  ON public.floq_boosts (user_id, created_at);

-- Enable RLS
ALTER TABLE public.floq_boosts ENABLE ROW LEVEL SECURITY;

-- Race-condition safe RLS policies
CREATE POLICY "boost: self_insert" 
  ON public.floq_boosts 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "boost: visible_active" 
  ON public.floq_boosts 
  FOR SELECT 
  USING (expires_at > now());

CREATE POLICY "boost: self_delete" 
  ON public.floq_boosts 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Enable realtime
ALTER TABLE public.floq_boosts REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  -- Check if table is already in publication to avoid duplicate errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'floq_boosts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_boosts;
  END IF;
END $$;

-- Update cleanup function for 1-hour expiry
CREATE OR REPLACE FUNCTION public.cleanup_expired_floq_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Clean up boosts expired for more than 5 minutes (1 hour + 5 minute buffer)
  DELETE FROM public.floq_boosts 
  WHERE expires_at < now() - interval '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;