-- ===============================================
-- Optimize Leaderboard Cache with Single Query Support
-- Add total_users column to eliminate second query
-- ===============================================

-- Drop existing materialized view to recreate with optimization
DROP MATERIALIZED VIEW IF EXISTS leaderboard_cache;

-- 2️⃣ OPTIMIZED MATERIALIZED VIEW (single query with total_users)
CREATE MATERIALIZED VIEW leaderboard_cache AS
SELECT  
  user_id,
  earned_count,
  rank,
  total_users
FROM (
  SELECT 
    user_id,
    COUNT(*) FILTER (WHERE earned_at IS NOT NULL) AS earned_count,
    COUNT(*) OVER () AS total_users,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE earned_at IS NOT NULL) DESC, user_id) AS rank
  FROM user_achievements
  GROUP BY user_id
) sub;

-- Fast point look-ups (recreate indexes)
CREATE UNIQUE INDEX leaderboard_cache_uid_idx ON leaderboard_cache(user_id);
CREATE INDEX leaderboard_cache_rank_idx ON leaderboard_cache(rank);

-- Grant read-only to clients
GRANT SELECT ON leaderboard_cache TO authenticated, anon;