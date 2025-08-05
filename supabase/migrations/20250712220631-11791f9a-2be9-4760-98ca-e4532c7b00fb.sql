-- Phase 3.1: Production-Safe Username Schema Migration (Simple Approach)
-- Handle view dependencies properly

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Backfill existing usernames to lowercase (safety measure)
UPDATE public.profiles 
SET username = LOWER(username) 
WHERE username != LOWER(username);

-- 3. Drop dependent views with CASCADE
DROP VIEW IF EXISTS v_friends_with_profile CASCADE;

-- 4. Drop existing problematic constraints and indexes
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_lower_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_reserved_check;
DROP INDEX IF EXISTS idx_profiles_username_lower;

-- 5. Convert username column to citext for automatic case-insensitive handling
ALTER TABLE public.profiles 
ALTER COLUMN username TYPE citext USING username::citext;

-- 6. Convert reserved_usernames.name to citext for consistency
ALTER TABLE public.reserved_usernames 
ALTER COLUMN name TYPE citext USING name::citext;

-- 7. Create bullet-proof unique index on citext username
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (username);
CREATE UNIQUE INDEX reserved_usernames_unique ON public.reserved_usernames (name);

-- 8. Add check constraint to prevent reserved username conflicts
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_not_reserved_check 
CHECK (username NOT IN (SELECT name FROM public.reserved_usernames));

-- 9. Recreate the v_friends_with_profile view with citext support
CREATE VIEW v_friends_with_profile AS
SELECT  
  f.user_id || '_' || f.friend_id AS friendship_id,
  CASE
    WHEN f.user_id = auth.uid() THEN f.friend_id
    ELSE f.user_id
  END AS friend_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at AS friend_since,
  f.created_at AS friendship_created_at
FROM friendships f
JOIN profiles p ON p.id = CASE
  WHEN f.user_id = auth.uid() THEN f.friend_id
  ELSE f.user_id
END
WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid());

-- 10. Mirror changes to demo schema
CREATE SCHEMA IF NOT EXISTS demo;

-- Create demo tables with citext username
CREATE TABLE IF NOT EXISTS demo.profiles (
  id uuid NOT NULL DEFAULT auth.uid(),
  display_name text NOT NULL,
  username citext NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  custom_status text,
  first_name text,
  last_name text,
  interests text[] DEFAULT ARRAY[]::text[],
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS demo.reserved_usernames (
  name citext NOT NULL,
  PRIMARY KEY (name)
);

-- Add indexes to demo schema
CREATE UNIQUE INDEX IF NOT EXISTS demo_profiles_username_unique ON demo.profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS demo_reserved_usernames_unique ON demo.reserved_usernames (name);

-- Add check constraint to demo schema safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'demo_profiles_username_not_reserved_check'
    AND table_schema = 'demo'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE demo.profiles 
    ADD CONSTRAINT demo_profiles_username_not_reserved_check 
    CHECK (username NOT IN (SELECT name FROM demo.reserved_usernames));
  END IF;
END $$;

-- 11. Add safety triggers
CREATE OR REPLACE FUNCTION ensure_username_lowercase()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username = LOWER(NEW.username::text)::citext;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_username_lowercase_trigger ON public.profiles;
CREATE TRIGGER profiles_username_lowercase_trigger
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_username_lowercase();

DROP TRIGGER IF EXISTS demo_profiles_username_lowercase_trigger ON demo.profiles;
CREATE TRIGGER demo_profiles_username_lowercase_trigger
  BEFORE INSERT OR UPDATE OF username ON demo.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_username_lowercase();

-- 12. Add performance indexes
CREATE INDEX IF NOT EXISTS profiles_username_trgm ON public.profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS demo_profiles_username_trgm ON demo.profiles USING gin(username gin_trgm_ops);

-- 13. Add monitoring function
CREATE OR REPLACE FUNCTION log_username_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE name = NEW.username) THEN
      RAISE WARNING 'Attempted to use reserved username: %', NEW.username;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_username_conflict_monitor ON public.profiles;
CREATE TRIGGER profiles_username_conflict_monitor
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_username_conflict();

-- 14. Populate demo data
INSERT INTO demo.reserved_usernames (name) VALUES 
  ('admin'), ('root'), ('api'), ('support'), ('help'), ('info')
ON CONFLICT (name) DO NOTHING;

-- 15. Enable RLS on demo tables
ALTER TABLE demo.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY IF NOT EXISTS "Demo profiles are publicly readable" 
ON demo.profiles FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Demo reserved usernames are readable" 
ON demo.reserved_usernames FOR SELECT USING (true);