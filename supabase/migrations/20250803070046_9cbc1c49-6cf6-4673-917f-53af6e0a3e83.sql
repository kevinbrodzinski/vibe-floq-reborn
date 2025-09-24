-- Create view for DM thread search with friend's profile info
CREATE OR REPLACE VIEW v_dm_threads_search AS
SELECT
  t.id as thread_id,
  t.member_a,
  t.member_b,
  t.last_message_at,
  t.unread_a,
  t.unread_b,
  CASE 
    WHEN t.member_a = auth.uid() THEN t.member_b_profile_id
    ELSE t.member_a_profile_id
  END as friend_profile_id,
  CASE 
    WHEN t.member_a = auth.uid() THEN pb.display_name
    ELSE pa.display_name
  END as friend_display_name,
  CASE 
    WHEN t.member_a = auth.uid() THEN pb.username
    ELSE pa.username
  END as friend_username,
  CASE 
    WHEN t.member_a = auth.uid() THEN pb.avatar_url
    ELSE pa.avatar_url
  END as friend_avatar_url,
  CASE 
    WHEN t.member_a = auth.uid() THEN t.unread_a
    ELSE t.unread_b
  END as my_unread_count
FROM direct_threads t
JOIN profiles pa ON pa.id = t.member_a_profile_id
JOIN profiles pb ON pb.id = t.member_b_profile_id;

-- Enable RLS on the view
ALTER VIEW v_dm_threads_search SET (security_invoker = true);

-- RLS policy: users can only see threads they're part of
CREATE POLICY "Users can view their own thread search results"
ON v_dm_threads_search FOR SELECT
USING (auth.uid() = member_a OR auth.uid() = member_b);

-- Create trigram extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fuzzy search on friend names
CREATE INDEX IF NOT EXISTS idx_dm_threads_search_trgm
ON profiles
USING gin ((display_name || ' ' || COALESCE(username, '')) gin_trgm_ops);