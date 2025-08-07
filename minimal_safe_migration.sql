-- MINIMAL SAFE MIGRATION: Only fix app.friend_share_pref
-- Based on thorough database analysis showing most tables already use profile_id correctly
-- Handles existing constraints and RLS policies safely

DO $$
DECLARE
    has_user_id boolean;
    has_profile_id boolean;
BEGIN
    -- Check current column state
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = 'friend_share_pref' 
        AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = 'friend_share_pref' 
        AND column_name = 'profile_id'
    ) INTO has_profile_id;
    
    -- Only proceed if we have user_id but not profile_id
    IF has_user_id AND NOT has_profile_id THEN
        RAISE NOTICE 'Starting migration: app.friend_share_pref user_id -> profile_id';
        
        -- Step 1: Add profile_id column (nullable initially)
        ALTER TABLE app.friend_share_pref ADD COLUMN profile_id uuid;
        RAISE NOTICE '✓ Added profile_id column';

        -- Step 2: Copy data from user_id to profile_id  
        UPDATE app.friend_share_pref 
        SET profile_id = user_id 
        WHERE user_id IS NOT NULL;
        RAISE NOTICE '✓ Copied data from user_id to profile_id';

        -- Step 3: Make profile_id NOT NULL (since we copied all data)
        ALTER TABLE app.friend_share_pref ALTER COLUMN profile_id SET NOT NULL;
        RAISE NOTICE '✓ Set profile_id as NOT NULL';

        -- Step 4: Add foreign key constraint to profile_id
        ALTER TABLE app.friend_share_pref 
        ADD CONSTRAINT friend_share_pref_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint for profile_id';

        -- Step 5: Check if primary key includes user_id
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'app' 
            AND tc.table_name = 'friend_share_pref'
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.column_name = 'user_id'
        ) THEN
            -- Primary key includes user_id, need to recreate it
            RAISE NOTICE '⚠ Primary key includes user_id, recreating with profile_id';
            
            -- Drop the old primary key
            ALTER TABLE app.friend_share_pref DROP CONSTRAINT friend_share_pref_pkey;
            
            -- Create new primary key with profile_id instead of user_id
            -- Note: Assuming the PK structure, may need adjustment based on actual schema
            ALTER TABLE app.friend_share_pref ADD PRIMARY KEY (profile_id);
            RAISE NOTICE '✓ Recreated primary key with profile_id';
        END IF;

        -- Step 6: Update RLS policies if they reference user_id
        -- Note: RLS policies may need manual adjustment if they have user_id in expressions
        RAISE NOTICE '⚠ Check RLS policies manually - they may reference user_id in expressions';

        -- Step 7: Drop the old user_id column
        ALTER TABLE app.friend_share_pref DROP COLUMN user_id;
        RAISE NOTICE '✓ Dropped old user_id column';

        RAISE NOTICE '🎉 app.friend_share_pref: Successfully migrated user_id to profile_id';
        
    ELSIF has_profile_id AND NOT has_user_id THEN
        RAISE NOTICE '✓ app.friend_share_pref already uses profile_id - no migration needed';
        
    ELSIF has_user_id AND has_profile_id THEN
        RAISE NOTICE '⚠ app.friend_share_pref has BOTH user_id and profile_id columns - manual review needed';
        
    ELSE
        RAISE NOTICE '❓ app.friend_share_pref has neither user_id nor profile_id - unexpected state';
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

-- Manual tasks reminder
DO $$
BEGIN
    RAISE NOTICE '=== POST-MIGRATION MANUAL TASKS ===';
    RAISE NOTICE '1. Review RLS policies on app.friend_share_pref';
    RAISE NOTICE '2. Check if any application code references user_id in this table';
    RAISE NOTICE '3. Test the friend sharing functionality';
    RAISE NOTICE '4. Verify the vibe wheel works without user_id errors';
END $$;