-- Database Schema Consolidation Migration
-- Fixes schema inconsistencies and ensures referential integrity

BEGIN;

-- 1. Ensure consistent profiles table structure
DO $$
BEGIN
    -- Drop any existing profiles table if it has inconsistent structure
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Check if the table has the correct structure
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'username' 
            AND data_type = 'citext'
        ) THEN
            -- Backup existing data
            CREATE TEMP TABLE profiles_backup AS SELECT * FROM public.profiles;
            
            -- Drop and recreate with correct structure
            DROP TABLE public.profiles CASCADE;
        END IF;
    END IF;
    
    -- Create the canonical profiles table
    CREATE TABLE IF NOT EXISTS public.profiles (
        id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email        TEXT UNIQUE,
        username     CITEXT UNIQUE,
        display_name TEXT,
        avatar_url   TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Restore backed up data if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup') THEN
        INSERT INTO public.profiles (id, email, username, display_name, avatar_url, created_at, updated_at)
        SELECT id, email, username, display_name, avatar_url, created_at, updated_at
        FROM profiles_backup
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW();
        
        DROP TABLE profiles_backup;
    END IF;
END $$;

-- 2. Ensure consistent floqs table structure
CREATE TABLE IF NOT EXISTS public.floqs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    location        GEOMETRY(POINT, 4326) NOT NULL,
    catchment_area  GEOMETRY(POLYGON, 4326),
    primary_vibe    TEXT NOT NULL,
    vibe_tag        TEXT,
    is_public       BOOLEAN DEFAULT true,
    max_members     INTEGER DEFAULT 50,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fix foreign key references to use consistent user ID pattern
-- Update all tables that reference users to use profile_id consistently

-- Fix vibes_now table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vibes_now') THEN
        -- Ensure it has profile_id column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vibes_now' AND column_name = 'profile_id') THEN
            ALTER TABLE public.vibes_now ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
            
            -- Migrate existing user_id data if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vibes_now' AND column_name = 'user_id') THEN
                UPDATE public.vibes_now SET profile_id = user_id WHERE profile_id IS NULL;
                ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS user_id;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix location_history table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_history') THEN
        -- Ensure it has profile_id column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'location_history' AND column_name = 'profile_id') THEN
            ALTER TABLE public.location_history ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
            
            -- Migrate existing user_id data if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'location_history' AND column_name = 'user_id') THEN
                UPDATE public.location_history SET profile_id = user_id WHERE profile_id IS NULL;
                ALTER TABLE public.location_history DROP COLUMN IF EXISTS user_id;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix friendships table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friendships') THEN
        -- Ensure it has proper foreign key references
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friendships' AND column_name = 'requester_id') THEN
            -- Add foreign key constraint if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'friendships_requester_id_fkey' 
                AND table_name = 'friendships'
            ) THEN
                ALTER TABLE public.friendships 
                ADD CONSTRAINT friendships_requester_id_fkey 
                FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
            END IF;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friendships' AND column_name = 'addressee_id') THEN
            -- Add foreign key constraint if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'friendships_addressee_id_fkey' 
                AND table_name = 'friendships'
            ) THEN
                ALTER TABLE public.friendships 
                ADD CONSTRAINT friendships_addressee_id_fkey 
                FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix floq_messages table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'floq_messages') THEN
        -- Ensure it has proper foreign key references
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'floq_messages' AND column_name = 'sender_id') THEN
            -- Add foreign key constraint if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'floq_messages_sender_id_fkey' 
                AND table_name = 'floq_messages'
            ) THEN
                ALTER TABLE public.floq_messages 
                ADD CONSTRAINT floq_messages_sender_id_fkey 
                FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
            END IF;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'floq_messages' AND column_name = 'floq_id') THEN
            -- Add foreign key constraint if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'floq_messages_floq_id_fkey' 
                AND table_name = 'floq_messages'
            ) THEN
                ALTER TABLE public.floq_messages 
                ADD CONSTRAINT floq_messages_floq_id_fkey 
                FOREIGN KEY (floq_id) REFERENCES public.floqs(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- 4. Ensure consistent user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  -- 1. derive a base username: before @, lower-cased, strip non-alnum
  base_username := regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9]', '', 'g');

  -- fallback for weird addresses like "+tag"
  IF base_username = '' THEN
     base_username := 'user';
  END IF;

  -- 2. find a free username ( user, user1, user2 … ) in one query
  LOOP
    final_username := base_username || CASE WHEN suffix = 0 THEN '' ELSE suffix::text END;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
    suffix := suffix + 1;
  END LOOP;

  -- 3. insert the profile row
  INSERT INTO public.profiles (id, email, username, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, final_username, final_username, NEW.raw_user_meta_data->>'avatar_url');

  RETURN NEW;
END;
$$;

-- 5. Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;

-- 7. Create consistent RLS policies for profiles
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;

CREATE POLICY "profiles_select_owner"
    ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles_update_owner"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_owner"
    ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 8. Create consistent RLS policies for floqs
DROP POLICY IF EXISTS "floqs_select_public" ON public.floqs;
DROP POLICY IF EXISTS "floqs_select_creator" ON public.floqs;
DROP POLICY IF EXISTS "floqs_insert_creator" ON public.floqs;
DROP POLICY IF EXISTS "floqs_update_creator" ON public.floqs;

CREATE POLICY "floqs_select_public"
    ON public.floqs
    FOR SELECT
    USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "floqs_insert_creator"
    ON public.floqs
    FOR INSERT
    WITH CHECK (creator_id = auth.uid());

CREATE POLICY "floqs_update_creator"
    ON public.floqs
    FOR UPDATE
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- 9. Add missing constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS floqs_creator_id_idx ON public.floqs (creator_id);
CREATE INDEX IF NOT EXISTS floqs_location_idx ON public.floqs USING GIST (location);

COMMIT;
