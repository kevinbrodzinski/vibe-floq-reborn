BEGIN;
SAVEPOINT before_cleanup;

/* orphaned pending friendships → delete */
WITH orphaned AS (
  SELECT f.*
  FROM public.friendships f
  WHERE f.friend_state = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.friend_requests r
      WHERE (r.profile_id = f.user_low  AND r.other_profile_id = f.user_high)
         OR (r.profile_id = f.user_high AND r.other_profile_id = f.user_low)
    )
)
DELETE FROM public.friendships f
USING orphaned o
WHERE f.user_low  = o.user_low
  AND f.user_high = o.user_high;

/* new indexes for direction-aware look-ups */
CREATE INDEX IF NOT EXISTS idx_friend_requests_direction
  ON public.friend_requests (profile_id, other_profile_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_pending_in
  ON public.friend_requests (other_profile_id)
  WHERE status = 'pending';

/* optional realtime refresh */
DO $$
BEGIN
  PERFORM pg_notify('friends_refresh', 'cleanup_done');
END $$;

/* REVIEW rows affected, then COMMIT */
COMMIT;