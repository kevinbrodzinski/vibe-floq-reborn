-- 2025-07-16   Case-insensitive unique usernames
-- ============================================

------------------------------------------------
-- 0. Ensure CITEXT is available (outside txn)
------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_extension
    WHERE  extname = 'citext'
  ) THEN
    CREATE EXTENSION citext;
  END IF;
END$$;

------------------------------------------------
-- 1. Drop legacy constraint if it exists
------------------------------------------------
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_key;

------------------------------------------------
-- 2. Find duplicates (same username, diff case)
------------------------------------------------
WITH dupes AS (
  SELECT DISTINCT ON (lower(username))
         ctid, id, username
  FROM   profiles
  ORDER  BY lower(username), created_at  -- keeps the earliest row
)
SELECT p.*
FROM   profiles p
JOIN   dupes   d       ON lower(p.username) = lower(d.username)
WHERE  p.ctid <> d.ctid;   -- rows that would collide
-- ↳ Review this list; if empty you're good.
--   If not, decide which rows to rename / merge.

------------------------------------------------
-- 3. Auto-rename extras (append _dupN)
------------------------------------------------
WITH ranked AS (
  SELECT ctid,
         row_number() OVER (PARTITION BY lower(username) ORDER BY created_at) AS rn
  FROM   profiles
)
UPDATE profiles p
SET    username = concat(username, '_dup', ranked.rn)
FROM   ranked
WHERE  p.ctid = ranked.ctid
  AND  ranked.rn > 1;

------------------------------------------------
-- 4. Create case-insensitive UNIQUE INDEX
------------------------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  uniq_profiles_username_lc
  ON profiles (lower(username))
  WHERE username IS NOT NULL;

------------------------------------------------
-- 5. Enforce NOT NULL & non-empty usernames
------------------------------------------------
ALTER TABLE profiles
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT username_not_empty
      CHECK (char_length(trim(username)) > 0);

-- (No COMMIT needed – Supabase runs each file in its own txn)