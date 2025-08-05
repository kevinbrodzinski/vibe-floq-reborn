-- Performance optimizations for achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress 
ON user_achievements (user_id, code) 
WHERE earned_at IS NULL AND progress > 0;

-- Index for efficient backfill operations
CREATE INDEX IF NOT EXISTS idx_user_achievements_backfill
ON user_achievements (user_id, earned_at, progress);

-- Index for efficient analytics queries
CREATE INDEX IF NOT EXISTS idx_achievements_earned_at
ON user_achievements (earned_at) 
WHERE earned_at IS NOT NULL;