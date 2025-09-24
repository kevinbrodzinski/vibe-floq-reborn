-- Fix Friend Request Race Conditions
-- This file creates an atomic function to accept friend requests safely

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.accept_friend_request_atomic(UUID);

-- Create atomic friend request acceptance function
CREATE OR REPLACE FUNCTION public.accept_friend_request_atomic(
  requester_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  request_record RECORD;
  result JSON;
BEGIN
  -- Get current authenticated user
  current_profile_id := auth.uid();
  IF current_profile_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock the friend request row to prevent race conditions
  SELECT id, profile_id, other_profile_id, status, created_at INTO request_record
  FROM friend_requests WHERE profile_id = requester_id AND other_profile_id = current_profile_id AND status = 'pending' FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Friend request not found or already processed'; END IF;

  -- Update the request status
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_record.id;

  -- Create friendship using the existing upsert_friendship function
  -- This handles the canonical user_low/user_high ordering automatically
  PERFORM upsert_friendship(current_profile_id, requester_id);

  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Friend request accepted successfully',
    'friendship_created', true,
    'request_id', request_record.id,
    'friend_profile_id', requester_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    result := json_build_object(
      'success', false,
      'error', SQLSTATE,
      'message', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.accept_friend_request_atomic TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.accept_friend_request_atomic(UUID) IS 'Atomically accepts a friend request, preventing race conditions by using row-level locking';