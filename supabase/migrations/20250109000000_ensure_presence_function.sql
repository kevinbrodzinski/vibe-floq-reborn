-- ═══════════════════════════════════════════════════════════════════════════════
-- Ensure Presence Row Function
-- Creates missing presence/status rows to prevent 406 errors
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to ensure presence row exists for a user
CREATE OR REPLACE FUNCTION public.ensure_presence_row(_profile_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure user_online_status row exists
  INSERT INTO public.user_online_status(profile_id, is_online, last_seen)
  VALUES(_profile_id, false, now())
  ON CONFLICT (profile_id) DO NOTHING;

  -- Ensure presence row exists (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'presence'
  ) THEN
    INSERT INTO public.presence(profile_id, started_at, expires_at)
    VALUES(_profile_id, now(), now() + interval '1 hour')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Ensure venue_live_presence row exists (if table exists)  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'venue_live_presence'
  ) THEN
    -- We don't create a default venue_live_presence as it's location-specific
    -- This table will be populated when user actually visits venues
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_presence_row(uuid) TO authenticated;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_online_status_profile_id 
  ON public.user_online_status(profile_id);

CREATE INDEX IF NOT EXISTS idx_presence_profile_id 
  ON public.presence(profile_id) 
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'presence'
  );