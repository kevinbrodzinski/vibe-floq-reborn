-- MINIMAL SAFE MIGRATION: Only fix app.friend_share_pref
-- Based on thorough database analysis showing most tables already use profile_id correctly

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = 'friend_share_pref' 
        AND column_name = 'profile_id'
    ) THEN
        -- Add profile_id column
        ALTER TABLE app.friend_share_pref ADD COLUMN profile_id uuid;

        -- Copy data from user_id to profile_id  
        UPDATE app.friend_share_pref 
        SET profile_id = user_id 
        WHERE user_id IS NOT NULL;

        -- Add foreign key constraint
        ALTER TABLE app.friend_share_pref 
        ADD CONSTRAINT friend_share_pref_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

        -- Make profile_id NOT NULL
        ALTER TABLE app.friend_share_pref ALTER COLUMN profile_id SET NOT NULL;

        -- Drop the old user_id column
        ALTER TABLE app.friend_share_pref DROP COLUMN user_id;

        RAISE NOTICE 'app.friend_share_pref: Successfully migrated user_id to profile_id';
    ELSE
        RAISE NOTICE 'app.friend_share_pref: profile_id column already exists';
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    rec record;
    found_columns boolean := false;
BEGIN
    RAISE NOTICE '=== FINAL CHECK FOR REMAINING user_id COLUMNS ===';
    
    FOR rec IN 
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns 
        WHERE column_name = 'user_id' 
        AND table_schema NOT IN ('auth', 'information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
    LOOP
        RAISE WARNING 'Found user_id column: %.%.%', rec.table_schema, rec.table_name, rec.column_name;
        found_columns := true;
    END LOOP;
    
    IF NOT found_columns THEN
        RAISE NOTICE '✅ No user_id columns found outside auth schema - migration complete!';
    END IF;
END $$;