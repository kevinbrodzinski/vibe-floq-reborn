-- ==============================================
-- Clean up conflicting thread functions and ensure schema consistency
-- ==============================================

-- Drop old thread functions that use member_a/member_b instead of member_a_profile_id/member_b_profile_id
DROP FUNCTION IF EXISTS public.find_or_create_dm(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_or_create_dm_thread(uuid, uuid);
DROP FUNCTION IF EXISTS public.search_direct_threads(text);
DROP FUNCTION IF EXISTS public.mark_thread_read(uuid, text);

-- Ensure our new functions are properly created (idempotent)
CREATE OR REPLACE FUNCTION public.create_or_get_thread(
  p_user_a uuid,
  p_user_b uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid;
  v_profile_a uuid;
  v_profile_b uuid;
BEGIN
  -- Convert auth.users.id to profiles.id
  SELECT id INTO v_profile_a FROM profiles WHERE id = p_user_a;
  SELECT id INTO v_profile_b FROM profiles WHERE id = p_user_b;
  
  IF v_profile_a IS NULL OR v_profile_b IS NULL THEN
    RAISE EXCEPTION 'One or both profiles not found';
  END IF;

  -- Try to find existing thread using profile IDs
  SELECT id INTO v_thread_id
  FROM direct_threads
  WHERE (member_a_profile_id = v_profile_a AND member_b_profile_id = v_profile_b)
     OR (member_a_profile_id = v_profile_b AND member_b_profile_id = v_profile_a);

  -- If not found, create new thread
  IF v_thread_id IS NULL THEN
    INSERT INTO direct_threads (
      member_a, 
      member_b, 
      member_a_profile_id, 
      member_b_profile_id,
      created_at,
      last_message_at,
      unread_a,
      unread_b
    )
    VALUES (
      LEAST(p_user_a, p_user_b),     -- auth.users.id for backward compatibility
      GREATEST(p_user_a, p_user_b),  -- auth.users.id for backward compatibility
      LEAST(v_profile_a, v_profile_b),     -- profiles.id for new schema
      GREATEST(v_profile_a, v_profile_b),  -- profiles.id for new schema
      NOW(),
      NOW(),
      0,
      0
    )
    RETURNING id INTO v_thread_id;
  END IF;

  RETURN v_thread_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_or_get_thread(uuid, uuid) TO authenticated;

-- Create a migration-safe version of mark_thread_read that works with profile IDs
CREATE OR REPLACE FUNCTION public.mark_thread_read_enhanced(
  p_thread_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update based on profile_id columns (new schema)
  UPDATE direct_threads
  SET 
    last_read_at_a = CASE WHEN member_a_profile_id = p_profile_id THEN NOW() ELSE last_read_at_a END,
    last_read_at_b = CASE WHEN member_b_profile_id = p_profile_id THEN NOW() ELSE last_read_at_b END,
    unread_a = CASE WHEN member_a_profile_id = p_profile_id THEN 0 ELSE unread_a END,
    unread_b = CASE WHEN member_b_profile_id = p_profile_id THEN 0 ELSE unread_b END
  WHERE id = p_thread_id
    AND (member_a_profile_id = p_profile_id OR member_b_profile_id = p_profile_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_thread_read_enhanced(uuid, uuid) TO authenticated;

-- Add comment to track this cleanup
COMMENT ON FUNCTION public.create_or_get_thread IS 'Unified thread creation function using profile IDs - replaces old find_or_create_dm';
COMMENT ON FUNCTION public.mark_thread_read_enhanced IS 'Enhanced thread read marking using profile IDs - replaces old mark_thread_read';