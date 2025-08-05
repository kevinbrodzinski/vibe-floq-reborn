-- Phase 3.1: Production-Safe Username Schema Migration (Optimized with micro-tweaks)

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Backfill existing usernames to lowercase
UPDATE public.profiles 
SET username = LOWER(username) 
WHERE username != LOWER(username);

-- 3. Drop dependent views with CASCADE
DROP VIEW IF EXISTS v_friends_with_profile CASCADE;

-- 4. Drop ALL existing constraints FIRST, then indexes
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_lower_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_reserved_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_not_reserved_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_unique;
ALTER TABLE public.reserved_usernames DROP CONSTRAINT IF EXISTS reserved_usernames_unique;

-- Now drop indexes
DROP INDEX IF EXISTS idx_profiles_username_lower;
DROP INDEX IF EXISTS profiles_username_unique;
DROP INDEX IF EXISTS reserved_usernames_unique;

-- 5. Convert username column to citext
ALTER TABLE public.profiles 
ALTER COLUMN username TYPE citext USING username::citext;

-- 6. Convert reserved_usernames.name to citext
ALTER TABLE public.reserved_usernames 
ALTER COLUMN name TYPE citext USING name::citext;

-- 7. Create table constraints (instead of unique indexes for readability)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

ALTER TABLE public.reserved_usernames 
ADD CONSTRAINT reserved_usernames_unique UNIQUE (name);

-- 8. Add check constraint to prevent reserved username conflicts
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_not_reserved_citext_check 
CHECK (username NOT IN (SELECT name FROM public.reserved_usernames));

-- 9. Recreate the v_friends_with_profile view
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

-- 10. Create demo schema and tables
CREATE SCHEMA IF NOT EXISTS demo;

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

-- 11. Add constraints to demo schema (table constraints for consistency)
ALTER TABLE demo.profiles 
ADD CONSTRAINT demo_profiles_username_unique UNIQUE (username);

ALTER TABLE demo.profiles 
ADD CONSTRAINT demo_profiles_username_not_reserved_citext_check 
CHECK (username NOT IN (SELECT name FROM demo.reserved_usernames));

-- 12. Optimized safety triggers (only run when username actually changes)
CREATE OR REPLACE FUNCTION ensure_username_lowercase()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if username is being inserted or actually changed
  IF TG_OP = 'INSERT' OR NEW.username IS DISTINCT FROM OLD.username THEN
    NEW.username = LOWER(NEW.username::text)::citext;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_username_lowercase_trigger
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_username_lowercase();

CREATE TRIGGER demo_profiles_username_lowercase_trigger
  BEFORE INSERT OR UPDATE OF username ON demo.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_username_lowercase();

-- 13. Performance indexes (commenting out trigram for now - uncomment if fuzzy search needed)
-- CREATE INDEX profiles_username_citext_trgm ON public.profiles USING gin(username gin_trgm_ops);
-- CREATE INDEX demo_profiles_username_citext_trgm ON demo.profiles USING gin(username gin_trgm_ops);

-- 14. Add monitoring function
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

CREATE TRIGGER profiles_username_conflict_monitor
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_username_conflict();

-- 15. Populate demo data
INSERT INTO demo.reserved_usernames (name) VALUES 
  ('admin'), ('root'), ('api'), ('support'), ('help'), ('info')
ON CONFLICT (name) DO NOTHING;

-- 16. Enable RLS on demo tables
ALTER TABLE demo.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- 17. Add RLS policies to demo schema
CREATE POLICY "Demo profiles are publicly readable" 
ON demo.profiles FOR SELECT USING (true);

CREATE POLICY "Demo reserved usernames are readable" 
ON demo.reserved_usernames FOR SELECT USING (true);