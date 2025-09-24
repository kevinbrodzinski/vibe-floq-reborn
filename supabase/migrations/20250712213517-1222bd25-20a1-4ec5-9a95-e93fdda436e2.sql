-- Enhanced profile schema hardening with collision-safe backfill
-- Phase 1: Database Hardening & Backfill for username/display_name consistency

-- Enable extensions for better search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- 1. Add missing columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Collision-safe username backfill with hash suffix to prevent duplicates
UPDATE public.profiles p
SET username = concat(
      left(split_part(u.email,'@',1),20),
      '_', substr(md5(p.id::text),1,4)
    )
FROM auth.users u
WHERE u.id = p.id
  AND p.username IS NULL;

-- 3. Backfill display_name from email local part (temporary until onboarding)
UPDATE public.profiles p
SET display_name = COALESCE(
      display_name,
      initcap(split_part(
        (SELECT email FROM auth.users WHERE auth.users.id = p.id),
        '@', 1
      ))
    )
WHERE display_name IS NULL;

-- 4. Normalize usernames to lowercase to avoid case conflicts
UPDATE public.profiles SET username = lower(username) WHERE username IS NOT NULL;

-- 5. Convert username to case-insensitive text type
ALTER TABLE public.profiles ALTER COLUMN username TYPE citext;

-- 6. Add NOT NULL constraints after backfill
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN display_name SET NOT NULL;

-- 7. Add unique constraint on username
ALTER TABLE public.profiles
ADD CONSTRAINT IF NOT EXISTS profiles_username_key UNIQUE (username);

-- 8. Add performance indexes for search
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_username_btree
  ON public.profiles (username);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_btree
  ON public.profiles (display_name);

-- 9. Mirror changes to demo schema if it exists
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
    ALTER TABLE demo.profiles 
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN display_name SET NOT NULL;

    -- Add unique constraint to demo schema
    ALTER TABLE demo.profiles
    ADD CONSTRAINT IF NOT EXISTS demo_profiles_username_key UNIQUE (username);

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