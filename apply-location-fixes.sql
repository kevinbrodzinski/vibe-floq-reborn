-- ====================================================================
-- FLOQ LOCATION SHARING FIXES - CONSOLIDATED APPLICATION SCRIPT
-- Run this script in your Supabase SQL editor to apply all fixes
-- ====================================================================

-- Check if migrations have been applied
DO $$
BEGIN
  -- Check if our functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_visible_friend_presence'
  ) THEN
    RAISE NOTICE 'Location sharing functions not found - applying fixes...';
  ELSE
    RAISE NOTICE 'Location sharing functions already exist - checking schema...';
  END IF;
END $$;

-- ====================================================================
-- 1. ENSURE FRIEND_SHARE_PREF TABLE HAS CORRECT SCHEMA
-- ====================================================================

-- Create the table with correct structure if it doesn't exist
CREATE TABLE IF NOT EXISTS public.friend_share_pref (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  other_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_live boolean NOT NULL DEFAULT false,
  ends_at timestamptz DEFAULT NULL,
  auto_when text[] DEFAULT ARRAY['always']::text[],
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, other_profile_id)
);

-- Enable RLS
ALTER TABLE public.friend_share_pref ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can manage their own sharing preferences" ON public.friend_share_pref;
CREATE POLICY "Users can manage their own sharing preferences"
  ON public.friend_share_pref
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ====================================================================
-- 2. LOCATION SHARING FUNCTIONS
-- ====================================================================

-- Function to set live sharing preferences between friends
CREATE OR REPLACE FUNCTION public.set_live_share(_friend uuid, _on boolean DEFAULT true)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  INSERT INTO public.friend_share_pref (profile_id, other_profile_id, is_live, updated_at)
  VALUES (auth.uid(), _friend, _on, now())
  ON CONFLICT (profile_id, other_profile_id)
  DO UPDATE SET
    is_live    = EXCLUDED.is_live,
    updated_at = now();
$function$;

-- Function to get visible friend presence based on sharing preferences
CREATE OR REPLACE FUNCTION public.get_visible_friend_presence(p_viewer uuid)
RETURNS TABLE(
  profile_id uuid, 
  lat double precision, 
  lng double precision, 
  vibe text, 
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH friends AS (
  SELECT CASE WHEN f.user_low = p_viewer THEN f.user_high ELSE f.user_low END AS friend_id
  FROM public.friendships f
  WHERE p_viewer IN (f.user_low, f.user_high) AND f.friend_state = 'accepted'
),
overrides AS (
  SELECT profile_id, other_profile_id, is_live,
         (ends_at IS NULL OR ends_at > now()) AS within_window
  FROM public.friend_share_pref
)
SELECT
  vn.profile_id,
  ST_Y(vn.location::geometry) AS lat,
  ST_X(vn.location::geometry) AS lng,
  vn.vibe::text               AS vibe,
  vn.updated_at
FROM public.vibes_now vn
JOIN friends fr ON fr.friend_id = vn.profile_id
LEFT JOIN overrides ov ON ov.profile_id = vn.profile_id AND ov.other_profile_id = p_viewer
JOIN profiles pr ON pr.id = vn.profile_id
WHERE vn.updated_at > now() - interval '5 minutes'
  AND (
    vn.visibility = 'public'
    OR (ov.is_live AND ov.within_window)
    OR pr.live_scope IN ('friends','mutuals')
  );
$$;

-- ====================================================================
-- 3. BULK SHARING FUNCTION (if it doesn't exist)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.set_live_share_bulk(
  _friend_ids UUID[],
  _on         BOOLEAN,
  _auto_when  text[] DEFAULT ARRAY['always']::text[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _fid UUID;
BEGIN
  FOREACH _fid IN ARRAY _friend_ids LOOP
    INSERT INTO public.friend_share_pref(
        profile_id, other_profile_id, is_live, auto_when, updated_at)
    VALUES (auth.uid(), _fid, _on, _auto_when, now())
    ON CONFLICT (profile_id, other_profile_id)
    DO UPDATE
      SET is_live    = EXCLUDED.is_live,
          auto_when  = EXCLUDED.auto_when,
          updated_at = now();
  END LOOP;
END;
$$;

-- ====================================================================
-- 4. PERMISSIONS
-- ====================================================================

-- Grant permissions
REVOKE EXECUTE ON FUNCTION public.set_live_share(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_live_share(uuid,boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_visible_friend_presence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_friend_presence(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[],boolean,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[],boolean,text[]) TO authenticated;

-- ====================================================================
-- 5. VERIFICATION
-- ====================================================================

DO $$
BEGIN
  -- Verify functions exist
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_visible_friend_presence'
  ) THEN
    RAISE NOTICE '✅ Location sharing functions successfully created/updated';
  ELSE
    RAISE NOTICE '❌ Location sharing functions missing - check for errors above';
  END IF;
  
  -- Verify table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'friend_share_pref'
  ) THEN
    RAISE NOTICE '✅ friend_share_pref table exists';
  ELSE
    RAISE NOTICE '❌ friend_share_pref table missing';
  END IF;
END $$;