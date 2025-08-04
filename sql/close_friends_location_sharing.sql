-- Close Friends Location Sharing Enhancement
-- Adds bulk location sharing functionality for close friends

BEGIN;

-- Add close friends location sharing preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS share_location_with_close_friends boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS close_friends_location_accuracy text DEFAULT 'approximate' CHECK (close_friends_location_accuracy IN ('exact', 'approximate', 'city')),
ADD COLUMN IF NOT EXISTS close_friends_auto_share_when text[] DEFAULT ARRAY['always']::text[];

-- Create index for close friends location sharing queries
CREATE INDEX IF NOT EXISTS idx_profiles_close_friends_location 
ON public.profiles (share_location_with_close_friends) 
WHERE share_location_with_close_friends = true;

-- Function to automatically sync close friends with location sharing preferences
CREATE OR REPLACE FUNCTION public.sync_close_friends_location_sharing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  friend_record RECORD;
  current_user_id uuid;
BEGIN
  -- Get the current user ID from the friendship change
  current_user_id := CASE 
    WHEN NEW.user_low = auth.uid() THEN NEW.user_low
    WHEN NEW.user_high = auth.uid() THEN NEW.user_high
    ELSE NULL
  END;
  
  -- Only proceed if this is the current user's action
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the friend ID
  DECLARE
    friend_id uuid := CASE 
      WHEN NEW.user_low = current_user_id THEN NEW.user_high
      ELSE NEW.user_low
    END;
  BEGIN
    -- Check if user has close friends location sharing enabled
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = current_user_id 
      AND share_location_with_close_friends = true
    ) THEN
      -- If friendship became close friend, add to location sharing
      IF NEW.is_close = true AND NEW.friend_state = 'accepted' THEN
        INSERT INTO public.friend_share_pref (profile_id, other_profile_id, is_live, updated_at)
        VALUES (current_user_id, friend_id, true, now())
        ON CONFLICT (profile_id, other_profile_id) 
        DO UPDATE SET 
          is_live = true,
          updated_at = now();
      
      -- If friendship is no longer close friend, remove from location sharing
      ELSIF NEW.is_close = false OR NEW.friend_state != 'accepted' THEN
        UPDATE public.friend_share_pref 
        SET is_live = false, updated_at = now()
        WHERE profile_id = current_user_id 
        AND other_profile_id = friend_id;
      END IF;
    END IF;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic close friends location sharing sync
DROP TRIGGER IF EXISTS trg_sync_close_friends_location ON public.friendships;
CREATE TRIGGER trg_sync_close_friends_location
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.sync_close_friends_location_sharing();

-- Function to enable location sharing with all current close friends
CREATE OR REPLACE FUNCTION public.enable_close_friends_location_sharing(
  accuracy_level text DEFAULT 'approximate',
  auto_when text[] DEFAULT ARRAY['always']::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  close_friend_record RECORD;
  added_count integer := 0;
  result jsonb;
BEGIN
  -- Validate authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate accuracy level
  IF accuracy_level NOT IN ('exact', 'approximate', 'city') THEN
    RAISE EXCEPTION 'Invalid accuracy level. Must be: exact, approximate, or city';
  END IF;
  
  -- Update user's close friends location sharing preferences
  UPDATE public.profiles 
  SET 
    share_location_with_close_friends = true,
    close_friends_location_accuracy = accuracy_level,
    close_friends_auto_share_when = auto_when,
    updated_at = now()
  WHERE id = current_user_id;
  
  -- Add all current close friends to location sharing
  FOR close_friend_record IN
    SELECT 
      CASE 
        WHEN f.user_low = current_user_id THEN f.user_high
        ELSE f.user_low
      END as friend_id
    FROM public.friendships f
    WHERE (f.user_low = current_user_id OR f.user_high = current_user_id)
      AND f.friend_state = 'accepted'
      AND f.is_close = true
  LOOP
    INSERT INTO public.friend_share_pref (profile_id, other_profile_id, is_live, updated_at)
    VALUES (current_user_id, close_friend_record.friend_id, true, now())
    ON CONFLICT (profile_id, other_profile_id) 
    DO UPDATE SET 
      is_live = true,
      updated_at = now();
    
    added_count := added_count + 1;
  END LOOP;
  
  -- Return result
  result := jsonb_build_object(
    'success', true,
    'enabled', true,
    'close_friends_added', added_count,
    'accuracy_level', accuracy_level,
    'auto_share_when', auto_when
  );
  
  RETURN result;
END;
$$;

-- Function to disable location sharing with all close friends
CREATE OR REPLACE FUNCTION public.disable_close_friends_location_sharing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  removed_count integer;
  result jsonb;
BEGIN
  -- Validate authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Update user's preferences
  UPDATE public.profiles 
  SET 
    share_location_with_close_friends = false,
    updated_at = now()
  WHERE id = current_user_id;
  
  -- Remove location sharing for all close friends
  UPDATE public.friend_share_pref 
  SET is_live = false, updated_at = now()
  WHERE profile_id = current_user_id
    AND other_profile_id IN (
      SELECT 
        CASE 
          WHEN f.user_low = current_user_id THEN f.user_high
          ELSE f.user_low
        END
      FROM public.friendships f
      WHERE (f.user_low = current_user_id OR f.user_high = current_user_id)
        AND f.friend_state = 'accepted'
        AND f.is_close = true
    );
  
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  -- Return result
  result := jsonb_build_object(
    'success', true,
    'enabled', false,
    'close_friends_removed', removed_count
  );
  
  RETURN result;
END;
$$;

-- Function to get close friends location sharing status
CREATE OR REPLACE FUNCTION public.get_close_friends_location_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_settings RECORD;
  close_friends_count integer;
  sharing_count integer;
  result jsonb;
BEGIN
  -- Validate authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's current settings
  SELECT 
    share_location_with_close_friends,
    close_friends_location_accuracy,
    close_friends_auto_share_when
  INTO user_settings
  FROM public.profiles 
  WHERE id = current_user_id;
  
  -- Count close friends
  SELECT COUNT(*) INTO close_friends_count
  FROM public.friendships f
  WHERE (f.user_low = current_user_id OR f.user_high = current_user_id)
    AND f.friend_state = 'accepted'
    AND f.is_close = true;
  
  -- Count how many close friends are currently being shared with
  SELECT COUNT(*) INTO sharing_count
  FROM public.friend_share_pref fsp
  JOIN public.friendships f ON (
    (f.user_low = current_user_id AND f.user_high = fsp.other_profile_id)
    OR
    (f.user_high = current_user_id AND f.user_low = fsp.other_profile_id)
  )
  WHERE fsp.profile_id = current_user_id
    AND fsp.is_live = true
    AND f.friend_state = 'accepted'
    AND f.is_close = true;
  
  -- Build result
  result := jsonb_build_object(
    'enabled', COALESCE(user_settings.share_location_with_close_friends, false),
    'accuracy_level', COALESCE(user_settings.close_friends_location_accuracy, 'approximate'),
    'auto_share_when', COALESCE(user_settings.close_friends_auto_share_when, ARRAY['always']::text[]),
    'close_friends_count', close_friends_count,
    'sharing_with_count', sharing_count,
    'all_close_friends_sharing', (close_friends_count > 0 AND sharing_count = close_friends_count)
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.enable_close_friends_location_sharing(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_close_friends_location_sharing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_close_friends_location_status() TO authenticated;

-- Create view for close friends location sharing overview
CREATE OR REPLACE VIEW public.v_close_friends_location_sharing AS
SELECT 
  p.id as user_id,
  p.display_name,
  p.share_location_with_close_friends,
  p.close_friends_location_accuracy,
  p.close_friends_auto_share_when,
  (
    SELECT COUNT(*)
    FROM public.friendships f
    WHERE (f.user_low = p.id OR f.user_high = p.id)
      AND f.friend_state = 'accepted'
      AND f.is_close = true
  ) as close_friends_count,
  (
    SELECT COUNT(*)
    FROM public.friend_share_pref fsp
    JOIN public.friendships f ON (
      (f.user_low = p.id AND f.user_high = fsp.other_profile_id)
      OR
      (f.user_high = p.id AND f.user_low = fsp.other_profile_id)
    )
    WHERE fsp.profile_id = p.id
      AND fsp.is_live = true
      AND f.friend_state = 'accepted'
      AND f.is_close = true
  ) as sharing_with_count
FROM public.profiles p
WHERE p.share_location_with_close_friends = true;

-- Add RLS policy for the view
ALTER VIEW public.v_close_friends_location_sharing OWNER TO postgres;

COMMIT;