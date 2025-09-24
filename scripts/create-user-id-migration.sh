#!/bin/bash

# Create User ID to Profile ID Migration
# This script helps create a safe migration for renaming user_id to profile_id

echo "🔄 Creating User ID to Profile ID Migration"
echo ""

# Create migration file
MIGRATION_NAME="rename_user_id_to_profile_id"
echo "📝 Creating migration: $MIGRATION_NAME"

# Create the migration
supabase migration new $MIGRATION_NAME

# Find the created migration file
MIGRATION_FILE=$(find supabase/migrations -name "*$MIGRATION_NAME.sql" | head -n 1)

if [ -z "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found"
    exit 1
fi

echo "✅ Migration file created: $MIGRATION_FILE"
echo ""

# Create migration content
cat > "$MIGRATION_FILE" << 'EOF'
-- Migration: Rename user_id to profile_id
-- This migration safely renames user_id columns to profile_id

-- Step 1: Add new profile_id columns to all tables that have user_id
-- (This allows for a safe transition period)

-- Example for profiles table:
-- ALTER TABLE profiles ADD COLUMN profile_id UUID;
-- UPDATE profiles SET profile_id = user_id;
-- ALTER TABLE profiles DROP COLUMN user_id;
-- ALTER TABLE profiles RENAME COLUMN profile_id TO user_id;

-- Step 2: Update foreign key constraints
-- ALTER TABLE table_name DROP CONSTRAINT constraint_name;
-- ALTER TABLE table_name ADD CONSTRAINT new_constraint_name 
--   FOREIGN KEY (profile_id) REFERENCES profiles(id);

-- Step 3: Update indexes
-- DROP INDEX IF EXISTS idx_table_user_id;
-- CREATE INDEX idx_table_profile_id ON table_name(profile_id);

-- Step 4: Update RLS policies
-- DROP POLICY IF EXISTS policy_name ON table_name;
-- CREATE POLICY policy_name ON table_name
--   FOR ALL USING (profile_id = auth.uid());

-- IMPORTANT: 
-- 1. Test this migration locally first
-- 2. Backup your production data
-- 3. Deploy during low-traffic periods
-- 4. Monitor application logs after deployment

-- Add your specific ALTER TABLE statements here:
-- ALTER TABLE your_table ADD COLUMN profile_id UUID;
-- UPDATE your_table SET profile_id = user_id;
-- ALTER TABLE your_table DROP COLUMN user_id;
-- ALTER TABLE your_table RENAME COLUMN profile_id TO user_id;
EOF

echo "📋 Migration template created!"
echo ""
echo "Next steps:"
echo "1. Edit $MIGRATION_FILE with your specific table changes"
echo "2. Test locally: ./scripts/db-sync.sh reset"
echo "3. Deploy: ./scripts/db-sync.sh push"
echo "4. Generate types: ./scripts/db-sync.sh types"
echo ""
echo "⚠️  Remember to:"
echo "- Backup production data before deploying"
echo "- Test the migration locally first"
echo "- Deploy during low-traffic periods"
echo "- Monitor application logs after deployment" 