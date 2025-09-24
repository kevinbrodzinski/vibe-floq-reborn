-- Performance indexes for DM message reactions
CREATE INDEX IF NOT EXISTS idx_dm_reactions_message_profile 
ON public.dm_message_reactions (message_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_dm_reactions_profile_recent 
ON public.dm_message_reactions (profile_id, reacted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_reactions_emoji_count 
ON public.dm_message_reactions (emoji, reacted_at DESC);

-- Composite index for reaction aggregation queries
CREATE INDEX IF NOT EXISTS idx_dm_reactions_message_emoji_time 
ON public.dm_message_reactions (message_id, emoji, reacted_at);

-- Performance indexes for DM media
CREATE INDEX IF NOT EXISTS idx_dm_media_thread_created 
ON public.dm_media (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_media_uploader_created 
ON public.dm_media (uploader_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_media_mime_type 
ON public.dm_media (mime_type, created_at DESC);

-- Index for media associated with specific messages
CREATE INDEX IF NOT EXISTS idx_dm_media_message_id 
ON public.dm_media (message_id) 
WHERE message_id IS NOT NULL;

-- Performance indexes for friend requests (if not already optimal)
CREATE INDEX IF NOT EXISTS idx_friend_requests_target_status_created 
ON public.friend_requests (other_profile_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status_created 
ON public.friend_requests (profile_id, status, created_at DESC);

-- Index for rate limiting friend requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_recent 
ON public.friend_requests (profile_id, created_at) 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Performance indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user_low_state 
ON public.friendships (user_low, friend_state);

CREATE INDEX IF NOT EXISTS idx_friendships_user_high_state 
ON public.friendships (user_high, friend_state);

-- Composite index for friendship lookups
CREATE INDEX IF NOT EXISTS idx_friendships_users_state_created 
ON public.friendships (user_low, user_high, friend_state, created_at);

-- Performance indexes for direct_messages (additional to existing ones)
CREATE INDEX IF NOT EXISTS idx_dm_content_search 
ON public.direct_messages USING gin(to_tsvector('english', content)) 
WHERE content IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dm_thread_profile_created 
ON public.direct_messages (thread_id, profile_id, created_at DESC);

-- Index for reply chains
CREATE INDEX IF NOT EXISTS idx_dm_reply_chain 
ON public.direct_messages (reply_to_id, created_at) 
WHERE reply_to_id IS NOT NULL;

-- Performance indexes for direct_threads (additional to existing ones)
CREATE INDEX IF NOT EXISTS idx_threads_member_a_unread 
ON public.direct_threads (member_a, unread_a) 
WHERE unread_a > 0;

CREATE INDEX IF NOT EXISTS idx_threads_member_b_unread 
ON public.direct_threads (member_b, unread_b) 
WHERE unread_b > 0;

-- Index for active threads (with recent messages)
CREATE INDEX IF NOT EXISTS idx_threads_recent_activity 
ON public.direct_threads (last_message_at DESC) 
WHERE last_message_at > NOW() - INTERVAL '30 days';

-- Indexes for user notifications related to messaging
CREATE INDEX IF NOT EXISTS idx_user_notifications_profile_kind_created 
ON public.user_notifications (profile_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_message_id 
ON public.user_notifications (message_id) 
WHERE message_id IS NOT NULL;

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
ON public.user_notifications (profile_id, read_at, created_at DESC) 
WHERE read_at IS NULL;

-- Partial index for presence queries related to friends
CREATE INDEX IF NOT EXISTS idx_presence_friends_updated 
ON public.presence (profile_id, updated_at DESC) 
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- Performance statistics and maintenance
-- Create a function to analyze query performance
CREATE OR REPLACE FUNCTION public.analyze_dm_performance()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  table_size TEXT,
  index_usage_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname||'.'||tablename as table_name,
    indexname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
    idx_tup_read + idx_tup_fetch as index_usage_count
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public' 
  AND tablename IN (
    'direct_messages', 
    'direct_threads', 
    'dm_message_reactions', 
    'dm_media', 
    'friend_requests', 
    'friendships',
    'user_notifications'
  )
  ORDER BY index_usage_count DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.analyze_dm_performance() TO authenticated;

-- Add comments for documentation
COMMENT ON INDEX idx_dm_reactions_message_profile IS 
'Optimizes reaction lookups by message and profile for toggle operations';

COMMENT ON INDEX idx_dm_reactions_profile_recent IS 
'Optimizes recent reaction queries by profile for activity feeds';

COMMENT ON INDEX idx_dm_media_thread_created IS 
'Optimizes media gallery queries by thread with chronological ordering';

COMMENT ON INDEX idx_friend_requests_sender_recent IS 
'Optimizes rate limiting queries for friend request frequency';

COMMENT ON INDEX idx_dm_content_search IS 
'Enables full-text search within direct message content';

COMMENT ON INDEX idx_threads_recent_activity IS 
'Optimizes active thread queries for recent conversation lists';

COMMENT ON FUNCTION public.analyze_dm_performance() IS 
'Provides performance analytics for DM-related database objects';