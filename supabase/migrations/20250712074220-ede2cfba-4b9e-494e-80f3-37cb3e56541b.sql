-- Phase 1B: Add rate limit performance index for boost analytics
-- This index optimizes the rate limiting query in the edge function

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floq_boosts_user_rate_limit 
  ON public.floq_boosts (user_id, created_at) 
  WHERE expires_at > now();

-- Add index for boost count queries used in get_active_floqs_with_members
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floq_boosts_active_count 
  ON public.floq_boosts (floq_id, boost_type) 
  WHERE expires_at > now();