-- Enhanced Location Sharing Migration
-- Adds auto_when and live_muted_until columns for sophisticated location sharing

-- Add auto_when column to friend_share_pref
ALTER TABLE public.friend_share_pref 
ADD COLUMN IF NOT EXISTS auto_when text[] DEFAULT ARRAY['always'];

-- Add live_muted_until column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS live_muted_until timestamptz;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_friend_share_pref_auto_when 
ON public.friend_share_pref(user_id, is_live, auto_when);

-- Create index for muted until queries
CREATE INDEX IF NOT EXISTS idx_profiles_live_muted_until 
ON public.profiles(id, live_muted_until);

-- Enhanced set_live_share RPC with auto_when support
CREATE OR REPLACE FUNCTION public.set_live_share(
  _friend uuid,
  _on boolean DEFAULT true,
  _auto_when text[] DEFAULT ARRAY['always']
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For local development without auth schema, use a placeholder user_id
  -- In production, this would be auth.uid()
  INSERT INTO public.friend_share_pref (user_id, friend_id, is_live, auto_when)
  VALUES ('00000000-0000-0000-0000-000000000000'::uuid, _friend, _on, _auto_when)
  ON CONFLICT (user_id, friend_id)
  DO UPDATE SET 
    is_live = EXCLUDED.is_live,
    auto_when = EXCLUDED.auto_when;
END;
$$;

-- Bulk set live share for multiple friends (useful for Floq joins)
CREATE OR REPLACE FUNCTION public.set_live_share_bulk(
  _friend_ids uuid[],
  _on boolean DEFAULT true,
  _auto_when text[] DEFAULT ARRAY['floq']
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _fid uuid;
BEGIN
  FOREACH _fid IN ARRAY _friend_ids LOOP
    INSERT INTO public.friend_share_pref (user_id, friend_id, is_live, auto_when)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, _fid, _on, _auto_when)
    ON CONFLICT (user_id, friend_id)
    DO UPDATE SET 
      is_live = EXCLUDED.is_live,
      auto_when = EXCLUDED.auto_when;
  END LOOP;
END;
$$;

-- Set live mute until timestamp
CREATE OR REPLACE FUNCTION public.set_live_mute_until(
  _until timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET live_muted_until = _until
  WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_live_share(uuid, boolean, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[], boolean, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_live_mute_until(timestamptz) TO authenticated; 