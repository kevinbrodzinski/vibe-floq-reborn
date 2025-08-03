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
  current_user_id UUID;
  request_record RECORD;
  result JSON;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Start transaction (implicit in function)
  
  -- 1. Find and lock the pending friend request
  SELECT id, profile_id, other_profile_id, status, created_at
  INTO request_record
  FROM friend_requests
  WHERE profile_id = requester_id 
    AND other_profile_id = current_user_id 
    AND status = 'pending'
  FOR UPDATE; -- Lock the row to prevent concurrent modifications
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
  
  -- 2. Update the friend request status atomically
  UPDATE friend_requests 
  SET 
    status = 'accepted',
    responded_at = NOW()
  WHERE id = request_record.id;
  
  -- 3. Create bidirectional friendship using existing RPC
  -- This handles the symmetric relationship creation
  PERFORM upsert_friendship(requester_id, 'accepted');
  
  -- 4. Return success result
  result := json_build_object(
    'success', true,
    'request_id', request_record.id,
    'friendship_created', true,
    'accepted_at', NOW()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, the transaction will be rolled back automatically
    RAISE EXCEPTION 'Failed to accept friend request: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_friend_request_atomic(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.accept_friend_request_atomic(UUID) IS 
'Atomically accepts a friend request and creates bidirectional friendship. Prevents race conditions by using row-level locking.';