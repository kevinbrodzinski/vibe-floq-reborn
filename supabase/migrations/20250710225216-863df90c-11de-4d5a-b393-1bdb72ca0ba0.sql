-- 1. Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_request_status') THEN
    CREATE TYPE friend_request_status AS ENUM ('pending','accepted','declined');
  END IF;
END$$;

-- 2. Drop old policy (if it exists)
DROP POLICY IF EXISTS "Friends: accept requests" ON friend_requests;

-- 3. Scrub legacy label if it exists
UPDATE friend_requests SET status='declined' WHERE status='rejected';

-- 4. Drop default only if present
ALTER TABLE friend_requests
  ALTER COLUMN status DROP DEFAULT IF EXISTS;

-- 5. Convert column
ALTER TABLE friend_requests
  ALTER COLUMN status TYPE friend_request_status
  USING status::friend_request_status;

-- 6. New default
ALTER TABLE friend_requests
  ALTER COLUMN status SET DEFAULT 'pending'::friend_request_status;

-- 7. Recreate policy accepting both outcomes
CREATE POLICY IF NOT EXISTS "Friends: accept requests"
  ON friend_requests
  FOR UPDATE
  USING  (friend_id = auth.uid())
  WITH CHECK (status IN ('accepted','declined'));

-- 8. Deprecate add_friend
COMMENT ON FUNCTION public.add_friend(uuid)
  IS 'DEPRECATED: Use request_friendship/respond_friend_request RPCs instead.';