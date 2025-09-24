/* ──────────────────────────────────────────────────────────
   1. Point *both* user_low & user_high to auth.users(id)
   ──────────────────────────────────────────────────────────*/
ALTER TABLE public.friendships
  DROP CONSTRAINT IF EXISTS fk_friendships_profile_id,
  DROP CONSTRAINT IF EXISTS friendships_friend_id_fkey,
  ADD  CONSTRAINT friendships_user_low_fkey
       FOREIGN KEY (user_low)
       REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD  CONSTRAINT friendships_user_high_fkey
       FOREIGN KEY (user_high)
       REFERENCES auth.users(id) ON DELETE CASCADE;

/* ──────────────────────────────────────────────────────────
   2. Default state should be 'pending'
   ──────────────────────────────────────────────────────────*/
ALTER TABLE public.friendships
  ALTER COLUMN friend_state SET DEFAULT 'pending';

/* ──────────────────────────────────────────────────────────
   3. Remove duplicate index on user_high
   ──────────────────────────────────────────────────────────*/
DROP INDEX IF EXISTS idx_friendships_friend;   -- keep idx_friendships_friend_id