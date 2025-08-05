BEGIN;

-- Back-fill missing usernames
WITH to_fix AS (
  SELECT p.id,
         lower(split_part(coalesce(au.email, 'user'), '@', 1)) AS base
  FROM   profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE  p.username IS NULL
)
, uniq AS (
  SELECT id,
         base ||
         COALESCE('_' || row_number() OVER (PARTITION BY base), '') AS candidate
  FROM   (
    SELECT id, base
    FROM   to_fix
  ) t
)
, resolved AS (
  SELECT u.id,
         -- if candidate already exists in full table, append hash
         CASE
           WHEN EXISTS (
             SELECT 1 FROM profiles p2 WHERE p2.username = u.candidate
           )
           THEN u.candidate || '_' || substr(md5(u.id::text), 1, 4)
           ELSE u.candidate
         END AS new_username
  FROM uniq u
)
UPDATE profiles p
SET    username = r.new_username
FROM   resolved r
WHERE  p.id = r.id;

-- Enforce NOT NULL (skip unique constraint since it already exists)
ALTER TABLE profiles
  ALTER COLUMN username SET NOT NULL;

COMMIT;