-- 1️⃣ De-duplicate both (A,B) and (B,A) - remove duplicates regardless of order
WITH ranked AS (
  SELECT user_a, user_b, status, created_at,
         ROW_NUMBER() OVER (
           PARTITION BY LEAST(user_a, user_b), GREATEST(user_a, user_b)
           ORDER BY created_at NULLS LAST
         ) AS rn
  FROM public.friends
)
DELETE FROM public.friends
WHERE (user_a, user_b) IN (
  SELECT user_a, user_b FROM ranked WHERE rn > 1
);

-- 2️⃣ Drop any conflicting constraints
ALTER TABLE public.friends
  DROP CONSTRAINT IF EXISTS friends_user_pair_unique;

-- 3️⃣ Create symmetric unique index for order-independent uniqueness
DROP INDEX IF EXISTS friends_unique_pair_idx;
CREATE UNIQUE INDEX friends_unique_pair_idx
  ON public.friends (LEAST(user_a, user_b), GREATEST(user_a, user_b));

-- 4️⃣ Back-fill accepted friendships from legacy friendships table
-- Note: friendships table contains only accepted relationships (no status column)
INSERT INTO public.friends (user_a, user_b, status, created_at)
SELECT f.user_id, f.friend_id, 'accepted', COALESCE(f.created_at, now())
FROM   public.friendships f
ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) DO NOTHING;

-- 5️⃣ Create trigger function to keep friendships and friends tables in sync
-- Note: friendships table has no status, so any insert means accepted
CREATE OR REPLACE FUNCTION public.sync_friendships_to_friends()
RETURNS trigger
LANGUAGE plpgsql AS
$$
BEGIN
  -- Any insert into friendships means it's an accepted friendship
  INSERT INTO public.friends (user_a, user_b, status, created_at)
  VALUES (NEW.user_id, NEW.friend_id, 'accepted', NEW.created_at)
  ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6️⃣ Create trigger on friendships table
DROP TRIGGER IF EXISTS trg_sync_friendships ON public.friendships;
CREATE TRIGGER trg_sync_friendships
AFTER INSERT ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.sync_friendships_to_friends();