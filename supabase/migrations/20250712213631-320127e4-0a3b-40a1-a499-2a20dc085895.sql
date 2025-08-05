-- Enhanced profile schema hardening with collision-safe backfill
-- Phase 1: Database Hardening & Backfill for username/display_name consistency

-- Enable extensions for better search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- 1. Add missing columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Store view definition before dropping it
DO $$
DECLARE
    view_definition TEXT;
BEGIN
    -- Get the view definition
    SELECT pg_get_viewdef('public.v_friends_with_profile', true) INTO view_definition;
    
    -- Drop the view temporarily
    DROP VIEW IF EXISTS public.v_friends_with_profile;
    
    -- Store view definition in a temporary table for later recreation
    CREATE TEMP TABLE IF NOT EXISTS temp_view_def (definition TEXT);
    DELETE FROM temp_view_def;
    INSERT INTO temp_view_def VALUES (view_definition);
END $$;

-- 3. Collision-safe username backfill with hash suffix to prevent duplicates
UPDATE public.profiles p
SET username = concat(
      left(split_part(u.email,'@',1),20),
      '_', substr(md5(p.id::text),1,4)
    )
FROM auth.users u
WHERE u.id = p.id
  AND p.username IS NULL;

-- 4. Backfill display_name from email local part (temporary until onboarding)
UPDATE public.profiles p
SET display_name = COALESCE(
      display_name,
      initcap(split_part(
        (SELECT email FROM auth.users WHERE auth.users.id = p.id),
        '@', 1
      ))
    )
WHERE display_name IS NULL;

-- 5. Normalize usernames to lowercase to avoid case conflicts
UPDATE public.profiles SET username = lower(username) WHERE username IS NOT NULL;

-- 6. Convert username to case-insensitive text type
ALTER TABLE public.profiles ALTER COLUMN username TYPE citext;

-- 7. Add NOT NULL constraints after backfill
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;

-- 8. Add unique constraint on username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_username_key' 
    AND table_name = 'profiles' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- 9. Recreate the view
DO $$
DECLARE
    view_def TEXT;
BEGIN
    SELECT definition INTO view_def FROM temp_view_def LIMIT 1;
    IF view_def IS NOT NULL THEN
        EXECUTE 'CREATE VIEW public.v_friends_with_profile AS ' || view_def;
    END IF;
    DROP TABLE IF EXISTS temp_view_def;
END $$;

-- 10. Add performance indexes for search
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_username_btree
  ON public.profiles (username);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_btree
  ON public.profiles (display_name);

-- 11. Mirror changes to demo schema if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'demo') THEN
    -- Add columns to demo.profiles
    ALTER TABLE demo.profiles
    ADD COLUMN IF NOT EXISTS first_name text,
    ADD COLUMN IF NOT EXISTS last_name text;

    -- Backfill demo usernames (already have good ones, just ensure no nulls)
    UPDATE demo.profiles 
    SET username = concat('demo_user_', substr(md5(id::text),1,8))
    WHERE username IS NULL;

    -- Backfill demo display_names
    UPDATE demo.profiles 
    SET display_name = COALESCE(display_name, 'Demo User ' || substr(id::text,1,8))
    WHERE display_name IS NULL;

    -- Normalize demo usernames to lowercase
    UPDATE demo.profiles SET username = lower(username) WHERE username IS NOT NULL;

    -- Convert demo username to citext
    ALTER TABLE demo.profiles ALTER COLUMN username TYPE citext;

    -- Add NOT NULL constraints to demo schema
    ALTER TABLE demo.profiles ALTER COLUMN username SET NOT NULL;
    ALTER TABLE demo.profiles ALTER COLUMN display_name SET NOT NULL;

    -- Add unique constraint to demo schema
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'demo_profiles_username_key' 
      AND table_name = 'profiles' 
      AND table_schema = 'demo'
    ) THEN
      ALTER TABLE demo.profiles ADD CONSTRAINT demo_profiles_username_key UNIQUE (username);
    END IF;

    -- Add indexes to demo schema
    CREATE INDEX IF NOT EXISTS idx_demo_profiles_username_trgm
      ON demo.profiles USING gin (username gin_trgm_ops);

    CREATE INDEX IF NOT EXISTS idx_demo_profiles_display_name_trgm
      ON demo.profiles USING gin (display_name gin_trgm_ops);

    CREATE INDEX IF NOT EXISTS idx_demo_profiles_username_btree
      ON demo.profiles (username);

    CREATE INDEX IF NOT EXISTS idx_demo_profiles_display_name_btree
      ON demo.profiles (display_name);
  END IF;
END $$;