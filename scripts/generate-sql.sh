#!/bin/bash

# SQL Template Generator
# Project: reztyrrafsmlvvlqvsqt

echo "📝 SQL Template Generator"
echo ""

case "$1" in
  "table")
    if [ -z "$2" ]; then
      echo "❌ Please provide table name"
      echo "Usage: ./scripts/generate-sql.sh table <table-name>"
      exit 1
    fi
    TABLE_NAME=$2
    echo "-- SQL Template for new table: $TABLE_NAME"
    echo "-- Apply this SQL to production via Supabase Dashboard"
    echo ""
    echo "CREATE TABLE IF NOT EXISTS $TABLE_NAME ("
    echo "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"
    echo "  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,"
    echo "  -- Add your columns here"
    echo "  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),"
    echo "  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
    echo ");"
    echo ""
    echo "-- Enable RLS"
    echo "ALTER TABLE $TABLE_NAME ENABLE ROW LEVEL SECURITY;"
    echo ""
    echo "-- Add RLS policies"
    echo "CREATE POLICY \"Users can view own data\" ON $TABLE_NAME"
    echo "  FOR SELECT USING (profile_id = auth.uid());"
    echo ""
    echo "CREATE POLICY \"Users can update own data\" ON $TABLE_NAME"
    echo "  FOR UPDATE USING (profile_id = auth.uid());"
    echo ""
    echo "CREATE POLICY \"Users can insert own data\" ON $TABLE_NAME"
    echo "  FOR INSERT WITH CHECK (profile_id = auth.uid());"
    echo ""
    echo "-- Add indexes for performance"
    echo "CREATE INDEX idx_${TABLE_NAME}_profile_id ON $TABLE_NAME(profile_id);"
    echo "CREATE INDEX idx_${TABLE_NAME}_created_at ON $TABLE_NAME(created_at);"
    ;;
    
  "column")
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "❌ Please provide table name and column name"
      echo "Usage: ./scripts/generate-sql.sh column <table-name> <column-name> [type]"
      exit 1
    fi
    TABLE_NAME=$2
    COLUMN_NAME=$3
    COLUMN_TYPE=${4:-"TEXT"}
    echo "-- SQL Template for adding column: $COLUMN_NAME to $TABLE_NAME"
    echo "-- Apply this SQL to production via Supabase Dashboard"
    echo ""
    echo "ALTER TABLE $TABLE_NAME"
    echo "ADD COLUMN $COLUMN_NAME $COLUMN_TYPE;"
    echo ""
    echo "-- Add default value if needed"
    echo "-- ALTER TABLE $TABLE_NAME ALTER COLUMN $COLUMN_NAME SET DEFAULT 'default_value';"
    ;;
    
  "index")
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "❌ Please provide table name and column name"
      echo "Usage: ./scripts/generate-sql.sh index <table-name> <column-name>"
      exit 1
    fi
    TABLE_NAME=$2
    COLUMN_NAME=$3
    echo "-- SQL Template for adding index: $COLUMN_NAME on $TABLE_NAME"
    echo "-- Apply this SQL to production via Supabase Dashboard"
    echo ""
    echo "CREATE INDEX idx_${TABLE_NAME}_${COLUMN_NAME} ON $TABLE_NAME($COLUMN_NAME);"
    ;;
    
  "policy")
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "❌ Please provide table name and policy name"
      echo "Usage: ./scripts/generate-sql.sh policy <table-name> <policy-name>"
      exit 1
    fi
    TABLE_NAME=$2
    POLICY_NAME=$3
    echo "-- SQL Template for RLS policy: $POLICY_NAME on $TABLE_NAME"
    echo "-- Apply this SQL to production via Supabase Dashboard"
    echo ""
    echo "CREATE POLICY \"$POLICY_NAME\" ON $TABLE_NAME"
    echo "  FOR SELECT USING (profile_id = auth.uid());"
    echo ""
    echo "-- Other policy types:"
    echo "-- CREATE POLICY \"$POLICY_NAME\" ON $TABLE_NAME"
    echo "--   FOR INSERT WITH CHECK (profile_id = auth.uid());"
    echo "-- CREATE POLICY \"$POLICY_NAME\" ON $TABLE_NAME"
    echo "--   FOR UPDATE USING (profile_id = auth.uid());"
    echo "-- CREATE POLICY \"$POLICY_NAME\" ON $TABLE_NAME"
    echo "--   FOR DELETE USING (profile_id = auth.uid());"
    ;;
    
  "migration")
    if [ -z "$2" ]; then
      echo "❌ Please provide migration name"
      echo "Usage: ./scripts/generate-sql.sh migration <migration-name>"
      exit 1
    fi
    MIGRATION_NAME=$2
    echo "-- Migration Template: $MIGRATION_NAME"
    echo "-- Apply this SQL to production via Supabase Dashboard"
    echo ""
    echo "-- Up migration"
    echo "-- Add your schema changes here"
    echo ""
    echo "-- Example:"
    echo "-- CREATE TABLE IF NOT EXISTS new_table ("
    echo "--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"
    echo "--   profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,"
    echo "--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
    echo "-- );"
    echo ""
    echo "-- Down migration (if needed)"
    echo "-- DROP TABLE IF EXISTS new_table;"
    ;;
    
  "backup")
    echo "-- Backup and Restore Template"
    echo "-- Apply this SQL to production via Supabase Dashboard"
    echo ""
    echo "-- Create backup table"
    echo "CREATE TABLE backup_table AS SELECT * FROM original_table;"
    echo ""
    echo "-- Restore from backup"
    echo "-- INSERT INTO original_table SELECT * FROM backup_table;"
    echo ""
    echo "-- Drop backup table"
    echo "-- DROP TABLE backup_table;"
    ;;
    
  *)
    echo "Usage: $0 {table|column|index|policy|migration|backup}"
    echo ""
    echo "Commands:"
    echo "  table     - Generate SQL for new table"
    echo "  column    - Generate SQL for adding column"
    echo "  index     - Generate SQL for adding index"
    echo "  policy    - Generate SQL for RLS policy"
    echo "  migration - Generate migration template"
    echo "  backup    - Generate backup/restore template"
    echo ""
    echo "Examples:"
    echo "  ./scripts/generate-sql.sh table user_preferences"
    echo "  ./scripts/generate-sql.sh column profiles bio TEXT"
    echo "  ./scripts/generate-sql.sh index profiles email"
    echo "  ./scripts/generate-sql.sh policy profiles user_access"
    echo "  ./scripts/generate-sql.sh migration add_user_preferences"
    echo ""
    echo "Apply generated SQL to production via:"
    echo "  https://supabase.com/dashboard/project/reztyrrafsmlvvlqvsqt"
    ;;
esac 