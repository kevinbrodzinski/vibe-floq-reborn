-- Fix Friend Request Race Conditions
-- Migration: Atomic friend request acceptance to prevent race conditions
-- Dependencies: Requires public.profiles, public.friend_requests, and public.friendships tables to exist
-- Also requires the existing upsert_friendship function

-- Function to atomically accept a friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request_atomic(
  p_request_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  request_record RECORD;
  requester_id UUID;
  result JSON;
BEGIN
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Lock and get the friend request
  SELECT fr.*, p.id as requester_profile_id
  INTO request_record
  FROM public.friend_requests fr
  JOIN public.profiles p ON fr.profile_id = p.id
  WHERE fr.id = p_request_id
    AND fr.other_profile_id = current_profile_id
    AND fr.status = 'pending'
  FOR UPDATE;
  
  -- Check if request exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;
  
  requester_id := request_record.requester_profile_id;
  
  -- Update request status to accepted
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_record.id;
  
  -- Create friendship using the existing upsert_friendship function
  -- This handles the canonical user_low/user_high ordering automatically
  PERFORM upsert_friendship(requester_id, 'accepted');
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Friend request accepted successfully',
    'friendship_created', true,
    'friend_profile_id', requester_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'success', false,
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- Function to atomically decline a friend request
CREATE OR REPLACE FUNCTION public.decline_friend_request_atomic(
  p_request_id UUID
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
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Lock and get the friend request
  SELECT *
  INTO request_record
  FROM public.friend_requests
  WHERE id = p_request_id
    AND other_profile_id = current_profile_id
    AND status = 'pending'
  FOR UPDATE;
  
  -- Check if request exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;
  
  -- Update request status to declined
  UPDATE friend_requests 
  SET status = 'declined', updated_at = NOW() 
  WHERE id = request_record.id;
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Friend request declined successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'success', false,
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- Function to cancel a sent friend request
CREATE OR REPLACE FUNCTION public.cancel_friend_request_atomic(
  p_request_id UUID
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
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Lock and get the friend request (sent by current user)
  SELECT *
  INTO request_record
  FROM public.friend_requests
  WHERE id = p_request_id
    AND profile_id = current_profile_id
    AND status = 'pending'
  FOR UPDATE;
  
  -- Check if request exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;
  
  -- Delete the request (cancel it)
  DELETE FROM friend_requests WHERE id = request_record.id;
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Friend request cancelled successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'success', false,
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- Function to get friend request status between two users
CREATE OR REPLACE FUNCTION public.get_friend_request_status(
  p_other_profile_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  outgoing_request RECORD;
  incoming_request RECORD;
  friendship_record RECORD;
  result JSON;
BEGIN
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Check for existing friendship first
  SELECT *
  INTO friendship_record
  FROM public.friendships
  WHERE (user_low = LEAST(current_profile_id, p_other_profile_id) 
         AND user_high = GREATEST(current_profile_id, p_other_profile_id));
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'status', 'friends',
      'friendship_status', friendship_record.friend_state,
      'since', friendship_record.created_at
    );
  END IF;
  
  -- Check for outgoing request
  SELECT *
  INTO outgoing_request
  FROM public.friend_requests
  WHERE profile_id = current_profile_id
    AND other_profile_id = p_other_profile_id
    AND status = 'pending';
  
  -- Check for incoming request
  SELECT *
  INTO incoming_request
  FROM public.friend_requests
  WHERE profile_id = p_other_profile_id
    AND other_profile_id = current_profile_id
    AND status = 'pending';
  
  -- Build result based on what we found
  IF outgoing_request IS NOT NULL THEN
    result := json_build_object(
      'success', true,
      'status', 'request_sent',
      'request_id', outgoing_request.id,
      'sent_at', outgoing_request.created_at
    );
  ELSIF incoming_request IS NOT NULL THEN
    result := json_build_object(
      'success', true,
      'status', 'request_received',
      'request_id', incoming_request.id,
      'received_at', incoming_request.created_at
    );
  ELSE
    result := json_build_object(
      'success', true,
      'status', 'none'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.accept_friend_request_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_friend_request_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_request_status(UUID) TO authenticated;