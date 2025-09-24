BEGIN;

-- Add unique index for friend requests to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS fr_unique
ON friend_requests (profile_id, other_profile_id);

COMMIT;