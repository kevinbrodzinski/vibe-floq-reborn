-- ==============================================
-- Add RPC function to get DM reactions by thread ID
-- This avoids the IN filter issues with potentially invalid UUIDs
-- ==============================================

-- Create RPC function to get reactions by thread_id in one go
CREATE OR REPLACE FUNCTION public.get_dm_reactions_by_thread(p_thread_id uuid)
RETURNS SETOF dm_message_reactions
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM dm_message_reactions r
  JOIN direct_messages m ON m.id = r.message_id
  WHERE m.thread_id = p_thread_id
  ORDER BY r.created_at ASC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dm_reactions_by_thread(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_dm_reactions_by_thread IS 'Get all message reactions for a thread without IN filter issues';