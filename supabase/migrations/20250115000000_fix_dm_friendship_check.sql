-- Fix DM thread creation to require friendship
-- Update get_or_create_dm_thread function to include friendship check using profile_id (main user identifier)

-- First, ensure are_friends function checks for accepted friendships only
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
STRICT
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships f
    WHERE ((f.user_low = user_a AND f.user_high = user_b)
       OR (f.user_high = user_a AND f.user_low = user_b))
    AND f.friend_state = 'accepted'::friend_state
  );
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_dm_thread(
  p_profile_a uuid, -- profile_id of first user
  p_profile_b uuid  -- profile_id of second user
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  -- Prevent self-messaging using profile_id
  IF p_profile_a = p_profile_b THEN
    RAISE EXCEPTION 'Cannot create DM thread with yourself';
  END IF;

  -- Check if profile_ids are friends (are_friends function expects profile_ids and checks for accepted state)
  IF NOT public.are_friends(p_profile_a, p_profile_b) THEN
    RAISE EXCEPTION 'Cannot create DM thread - users are not friends';
  END IF;

  -- Get user IDs from profile IDs (profiles.id references auth.users.id)
  -- In this system, profile_id is the same as user_id from auth.users
  v_user_a := p_profile_a;
  v_user_b := p_profile_b;

  -- 1. ensure canonical order for user IDs (matches direct_threads structure)
  IF v_user_a > v_user_b THEN
    -- Swap both user IDs and profile IDs to maintain consistency
    v_thread_id := v_user_a;
    v_user_a := v_user_b;
    v_user_b := v_thread_id;
    
    v_thread_id := p_profile_a;
    p_profile_a := p_profile_b;
    p_profile_b := v_thread_id;
  END IF;

  -- 2. try to find existing thread using user IDs
  SELECT id INTO v_thread_id
  FROM direct_threads
  WHERE member_a = v_user_a
    AND member_b = v_user_b
  LIMIT 1;

  -- 3. create if not found
  IF v_thread_id IS NULL THEN
    INSERT INTO direct_threads (
      member_a,
      member_b,
      member_a_profile_id,
      member_b_profile_id
    )
    VALUES (v_user_a, v_user_b, p_profile_a, p_profile_b)
    RETURNING id INTO v_thread_id;
  END IF;

  RETURN v_thread_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_thread(uuid, uuid) TO authenticated;