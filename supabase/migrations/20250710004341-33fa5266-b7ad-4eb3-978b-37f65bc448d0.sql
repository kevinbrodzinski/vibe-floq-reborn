-- Enhanced DM unread tracking with proper constraints and performance optimizations

-- 1. Add last_read_at columns with NOT NULL and proper defaults
ALTER TABLE public.direct_threads 
ADD COLUMN last_read_at_a timestamptz NOT NULL DEFAULT now(),
ADD COLUMN last_read_at_b timestamptz NOT NULL DEFAULT now();

-- 2. Create indexes for efficient unread queries
CREATE INDEX idx_direct_threads_member_a_last_read 
ON public.direct_threads(member_a, last_read_at_a) 
WHERE last_message_at > last_read_at_a;

CREATE INDEX idx_direct_threads_member_b_last_read 
ON public.direct_threads(member_b, last_read_at_b) 
WHERE last_message_at > last_read_at_b;

-- 3. Function to update last_read_at for either member
CREATE OR REPLACE FUNCTION update_last_read_at(
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

-- 4. Function to get unread counts for a user
CREATE OR REPLACE FUNCTION get_unread_counts(user_id_param uuid)
RETURNS TABLE(
  thread_id uuid,
  friend_id uuid,
  unread_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id as thread_id,
    CASE 
      WHEN dt.member_a = user_id_param THEN dt.member_b
      ELSE dt.member_a
    END as friend_id,
    CASE
      WHEN dt.member_a = user_id_param AND dt.last_message_at > dt.last_read_at_a THEN
        (SELECT count(*) FROM public.direct_messages dm 
         WHERE dm.thread_id = dt.id AND dm.created_at > dt.last_read_at_a)
      WHEN dt.member_b = user_id_param AND dt.last_message_at > dt.last_read_at_b THEN
        (SELECT count(*) FROM public.direct_messages dm 
         WHERE dm.thread_id = dt.id AND dm.created_at > dt.last_read_at_b)
      ELSE 0
    END as unread_count
  FROM public.direct_threads dt
  WHERE (dt.member_a = user_id_param OR dt.member_b = user_id_param)
    AND COALESCE(dt.last_message_at, '1970-01-01'::timestamptz) > 
        CASE 
          WHEN dt.member_a = user_id_param THEN COALESCE(dt.last_read_at_a, '1970-01-01'::timestamptz)
          ELSE COALESCE(dt.last_read_at_b, '1970-01-01'::timestamptz)
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. RLS policy for updating last_read timestamps
CREATE POLICY "threads: update last_read" ON public.direct_threads
  FOR UPDATE
  USING (auth.uid() IN (member_a, member_b))
  WITH CHECK (
    (member_a = auth.uid() AND last_read_at_a IS NOT NULL)
    OR (member_b = auth.uid() AND last_read_at_b IS NOT NULL)
  );

-- 6. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_last_read_at(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_counts(uuid) TO authenticated;

-- 7. Backfill existing threads (everything starts as "read")
UPDATE public.direct_threads 
SET 
  last_read_at_a = COALESCE(last_message_at, created_at),
  last_read_at_b = COALESCE(last_message_at, created_at);