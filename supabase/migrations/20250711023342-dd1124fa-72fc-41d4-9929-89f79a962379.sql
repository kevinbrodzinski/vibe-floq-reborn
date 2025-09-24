-- ===============================================
-- High-Performance Leaderboard System
-- Materialized view + pg_cron for sub-200ms queries
-- ===============================================

-- 1️⃣ EXTENSIONS (Supabase already has these, but ensure they exist)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2️⃣ MATERIALIZED VIEW (pre-aggregated leaderboard slice)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_cache AS
SELECT  
  user_id,
  COUNT(*) FILTER (WHERE earned_at IS NOT NULL) AS earned_count,
  ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE earned_at IS NOT NULL) DESC, user_id) AS rank
FROM user_achievements
GROUP BY user_id;

-- Fast point look-ups
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_cache_uid_idx ON leaderboard_cache(user_id);
CREATE INDEX IF NOT EXISTS leaderboard_cache_rank_idx ON leaderboard_cache(rank);

-- Grant read-only to clients
GRANT SELECT ON leaderboard_cache TO authenticated, anon;

-- 3️⃣ REFRESH FUNCTION (so we don't block DDL with pg_cron)
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
END;
$$;

-- Keep it super-lean: EXECUTE privilege only
GRANT EXECUTE ON FUNCTION refresh_leaderboard_cache() TO postgres, supabase_admin;

-- 4️⃣ CRON JOB (every 5 minutes – adjust as you grow)
SELECT cron.schedule(
  'refresh_leaderboard_cache_every_5min',      -- job name
  '*/5 * * * *',                               -- standard cron syntax
  $$SELECT refresh_leaderboard_cache();$$
);