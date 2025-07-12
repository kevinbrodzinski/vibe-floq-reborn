-- Phase 1B: Add performance indexes for boost analytics without time predicates
-- These indexes optimize the rate limiting and boost count queries

-- Index for rate limiting queries (user_id, created_at) - simple composite index
CREATE INDEX IF NOT EXISTS idx_floq_boosts_user_rate_limit 
  ON public.floq_boosts (user_id, created_at);

-- Index for boost count queries (floq_id, boost_type) - simple composite index
CREATE INDEX IF NOT EXISTS idx_floq_boosts_count_query 
  ON public.floq_boosts (floq_id, boost_type);

-- Index for cleanup operations (expires_at) - simple single column index
CREATE INDEX IF NOT EXISTS idx_floq_boosts_expires_cleanup 
  ON public.floq_boosts (expires_at);