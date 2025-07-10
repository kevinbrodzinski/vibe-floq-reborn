-- 1. Create friend_request_status enum 
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined');

-- 2. Update friend_requests table to use the enum
ALTER TABLE friend_requests 
ALTER COLUMN status TYPE friend_request_status 
USING status::friend_request_status;

-- 3. Set default value
ALTER TABLE friend_requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Deprecate add_friend function (mark as deprecated)
COMMENT ON FUNCTION public.add_friend(uuid) IS 'DEPRECATED: Use friend request system instead. Will be removed in future version.';