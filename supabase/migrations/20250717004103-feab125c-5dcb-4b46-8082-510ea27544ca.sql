-- 2025-07-16 - Case-insensitive USERNAME uniqueness
-- ================================================

BEGIN;

-- 1. (optional) Install citext for future convenience
--    (you can skip this if you don't plan to cast to CITEXT later)
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Drop the old unique constraint, if it exists
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 3-A. Detect any duplicates that would block the new index
--     (same username ignoring case)
WITH dupes AS (
  SELECT lower(username) AS uname, MIN(id) AS keeper_id
  FROM   profiles
  GROUP  BY 1
  HAVING COUNT(*) > 1
)
SELECT p.*
FROM   profiles p
JOIN   dupes   d ON lower(p.username) = d.uname
WHERE  p.id <> d.keeper_id;

-- ⚠️  If the query above returns rows,
--     decide which one(s) to rename or delete, then continue.

-- 3-B. (optional) Example auto-fix: append "_dup" to extras
--      so the new index can be created without manual edits.
WITH numbered AS (
  SELECT id,
         row_number() OVER (PARTITION BY lower(username) ORDER BY id) AS rn
  FROM   profiles
)
UPDATE profiles p
SET    username = username || '_dup' || rn
FROM   numbered n
WHERE  p.id = n.id
  AND  n.rn > 1;

-- 4. Create a case-insensitive unique index (CONCURRENTLY to avoid a lock)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  uniq_profiles_username_lower
  ON profiles (lower(username));

-- 5. Enforce NOT NULL / NOT EMPTY at the DB level
ALTER TABLE profiles
  ALTER COLUMN username SET NOT NULL,
  ADD    CONSTRAINT username_not_empty
         CHECK (char_length(trim(username)) > 0);

COMMIT;