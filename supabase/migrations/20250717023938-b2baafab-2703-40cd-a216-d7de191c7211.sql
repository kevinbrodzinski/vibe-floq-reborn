-- ▸ 1.  Add nullable e-mail column
ALTER TABLE public.profiles
ADD COLUMN email text;

-- ▸ 2.  Enforce uniqueness (case-insensitive) **only when email IS NOT NULL**
--     – avoids breakage for existing rows without an address.
CREATE UNIQUE INDEX IF NOT EXISTS
    uniq_profiles_email_lc
ON  public.profiles (lower(email))
WHERE email IS NOT NULL;

-- ▸ 3.  Document it for future devs
COMMENT ON COLUMN public.profiles.email IS
  'Optional user e-mail address. Uniquely indexed (case-insensitive) when present.';

-- ▸ 4.  (Optional) revoke column from normal clients if you don't want it sent over PostgREST
-- REVOKE ALL ON COLUMN public.profiles.email FROM authenticated;