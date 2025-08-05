-- Phase 3.1: Production-Safe Username Schema Migration (Fixed)
-- Using CITEXT approach for case-insensitive, race-condition-free usernames

-- 1. Enable citext extension for case-insensitive text handling
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Backfill existing usernames to lowercase (safety measure)
UPDATE public.profiles 
SET username = LOWER(username) 
WHERE username != LOWER(username);

-- 3. Drop existing problematic constraints and indexes
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_lower_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_reserved_check;
DROP INDEX IF EXISTS idx_profiles_username_lower;

-- 4. Convert username column to citext for automatic case-insensitive handling
ALTER TABLE public.profiles 
ALTER COLUMN username TYPE citext USING username::citext;

-- 5. Convert reserved_usernames.name to citext for consistency
ALTER TABLE public.reserved_usernames 
ALTER COLUMN name TYPE citext USING name::citext;

-- 6. Create bullet-proof unique index on citext username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS reserved_usernames_unique ON public.reserved_usernames (name);

-- 7. Add check constraint to prevent reserved username conflicts
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_not_reserved_check 
CHECK (username NOT IN (SELECT name FROM public.reserved_usernames));

-- 8. Mirror all changes to demo schema for mock/live switch compatibility
-- Create demo schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS demo;

-- Create demo.profiles table with same structure
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

-- Create demo.reserved_usernames table
CREATE TABLE IF NOT EXISTS demo.reserved_usernames (
  name citext NOT NULL,
  PRIMARY KEY (name)
);

-- Add same constraints to demo schema
CREATE UNIQUE INDEX IF NOT EXISTS demo_profiles_username_unique ON demo.profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS demo_reserved_usernames_unique ON demo.reserved_usernames (name);

-- Add check constraint to demo schema (with proper conditional logic)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'demo_profiles_username_not_reserved_check'
  ) THEN
    ALTER TABLE demo.profiles 
    ADD CONSTRAINT demo_profiles_username_not_reserved_check 
    CHECK (username NOT IN (SELECT name FROM demo.reserved_usernames));
  END IF;
END $$;

-- 9. Add safety trigger to ensure data consistency
CREATE OR REPLACE FUNCTION ensure_username_lowercase()
RETURNS TRIGGER AS $$
BEGIN
  -- citext handles case-insensitivity automatically, but this ensures consistency
  NEW.username = LOWER(NEW.username::text)::citext;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to both schemas
DROP TRIGGER IF EXISTS profiles_username_lowercase_trigger ON public.profiles;
CREATE TRIGGER profiles_username_lowercase_trigger
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_username_lowercase();

DROP TRIGGER IF EXISTS demo_profiles_username_lowercase_trigger ON demo.profiles;
CREATE TRIGGER demo_profiles_username_lowercase_trigger
  BEFORE INSERT OR UPDATE OF username ON demo.profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_username_lowercase();

-- 10. Add performance indexes for search operations (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_username_trgm ON public.profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS demo_profiles_username_trgm ON demo.profiles USING gin(username gin_trgm_ops);

-- 11. Add monitoring function to detect username conflicts
CREATE OR REPLACE FUNCTION log_username_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Log potential conflicts for monitoring
    IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE name = NEW.username) THEN
      RAISE WARNING 'Attempted to use reserved username: %', NEW.username;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply monitoring trigger
DROP TRIGGER IF EXISTS profiles_username_conflict_monitor ON public.profiles;
CREATE TRIGGER profiles_username_conflict_monitor
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_username_conflict();

-- 12. Populate demo.reserved_usernames with some test data
INSERT INTO demo.reserved_usernames (name) VALUES 
  ('admin'), ('root'), ('api'), ('support'), ('help'), ('info')
ON CONFLICT (name) DO NOTHING;

-- 13. Enable RLS on demo tables if not already enabled
ALTER TABLE demo.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for demo schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'demo' AND tablename = 'profiles' 
    AND policyname = 'Demo profiles are publicly readable'
  ) THEN
    CREATE POLICY "Demo profiles are publicly readable" 
    ON demo.profiles FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'demo' AND tablename = 'reserved_usernames' 
    AND policyname = 'Demo reserved usernames are readable'
  ) THEN
    CREATE POLICY "Demo reserved usernames are readable" 
    ON demo.reserved_usernames FOR SELECT USING (true);
  END IF;
END $$;