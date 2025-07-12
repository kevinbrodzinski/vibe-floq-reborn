-- Create the missing update_last_read_at function
CREATE OR REPLACE FUNCTION public.update_last_read_at(
  thread_id_param uuid,
  user_id_param uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.direct_threads
  SET 
    last_read_at_a = CASE WHEN member_a = user_id_param THEN now() ELSE last_read_at_a END,
    last_read_at_b = CASE WHEN member_b = user_id_param THEN now() ELSE last_read_at_b END
  WHERE id = thread_id_param
    AND (member_a = user_id_param OR member_b = user_id_param);
  
  -- Notify UI to invalidate unread counts cache
  PERFORM pg_notify('dm_read_status', json_build_object(
    'thread_id', thread_id_param,
    'user_id', user_id_param
  )::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_last_read_at(uuid, uuid) TO authenticated;