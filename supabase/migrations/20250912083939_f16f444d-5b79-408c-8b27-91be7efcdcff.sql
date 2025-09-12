-- Rally performance indexes for fast inbox/threads

-- Rallies list & lifecycle
CREATE INDEX IF NOT EXISTS idx_rallies_status_expires ON rallies(status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_rallies_creator_time ON rallies(creator_id, created_at DESC);

-- Invites lookups
CREATE INDEX IF NOT EXISTS idx_invites_rally_status ON rally_invites(rally_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_to_profile ON rally_invites(to_profile, rally_id);

-- Messages paging per thread
CREATE INDEX IF NOT EXISTS idx_rally_messages_thread_time ON rally_messages(thread_id, created_at);

-- Last seen lookups
CREATE UNIQUE INDEX IF NOT EXISTS pk_rally_last_seen ON rally_last_seen(profile_id, rally_id);
CREATE INDEX IF NOT EXISTS idx_last_seen_profile_time ON rally_last_seen(profile_id, last_seen_at DESC);