-- Fix DM thread creation to require friendship
-- Update get_or_create_dm_thread function to include friendship check

CREATE OR REPLACE FUNCTION public.get_or_create_dm_thread(
  p_user_a uuid,
  p_user_b uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid;
BEGIN
  -- Prevent self-messaging
  IF p_user_a = p_user_b THEN
    RAISE EXCEPTION 'Cannot create DM thread with yourself';
  END IF;

  -- Check if users are friends
  IF NOT public.are_friends(p_user_a, p_user_b) THEN
    RAISE EXCEPTION 'Cannot create DM thread - users are not friends';
  END IF;

  -- 1. ensure canonical order (matches uniq_thread_pair)
  IF p_user_a > p_user_b THEN
    v_thread_id := p_user_a;
    p_user_a    := p_user_b;
    p_user_b    := v_thread_id;
  END IF;

  -- 2. try to find existing thread
  SELECT id INTO v_thread_id
  FROM direct_threads
  WHERE member_a = p_user_a
    AND member_b = p_user_b
  LIMIT 1;

  -- 3. create if not found
  IF v_thread_id IS NULL THEN
    INSERT INTO direct_threads (
      member_a,
      member_b,
      member_a_profile_id,
      member_b_profile_id
    )
    VALUES (p_user_a, p_user_b, p_user_a, p_user_b)
    RETURNING id INTO v_thread_id;
  END IF;

  RETURN v_thread_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_thread(uuid, uuid) TO authenticated;