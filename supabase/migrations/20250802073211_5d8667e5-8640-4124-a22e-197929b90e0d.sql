-- Ensure the critical index exists for vibes_now queries
CREATE INDEX IF NOT EXISTS vibes_now_recent_h3_ix ON vibes_now (h3_7, updated_at DESC);