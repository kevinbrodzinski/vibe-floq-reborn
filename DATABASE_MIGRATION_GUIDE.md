# Database Migration Guide - Profile ID Update

## 🎯 **Choose the Right Migration Script**

### **Scenario 1: Fresh Setup (Tables Don't Exist Yet)**
**Use:** `CREATE_ENHANCED_VIBE_TABLES.sql`

If you haven't run the enhanced vibe detection migrations yet, use this script. It creates all tables with `profile_id` from the start.

```sql
-- Copy and paste the entire content from:
-- supabase/migrations/CREATE_ENHANCED_VIBE_TABLES.sql
```

### **Scenario 2: Update Existing Tables (Tables Already Exist with user_id)**
**Use:** `SAFE_PROFILE_ID_UPDATE.sql`

If you already ran the enhanced vibe detection migrations and have tables with `user_id`, use this script to safely update them.

```sql
-- Copy and paste the entire content from:
-- supabase/migrations/SAFE_PROFILE_ID_UPDATE.sql
```

## ✅ **How to Run in Supabase SQL Editor**

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** (left sidebar)
3. **Create a new query**
4. **Copy and paste** the entire content of the appropriate migration file
5. **Click "Run"** to execute the migration
6. **Check the output** for success messages

## 🔍 **How to Check Which Scenario You're In**

Run this query first to check if the tables exist and what columns they have:

```sql
-- Check if enhanced vibe tables exist and their structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('vibe_system_metrics', 'vibe_user_learning', 'location_vibe_patterns')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**Results:**
- **No results** = Use `CREATE_ENHANCED_VIBE_TABLES.sql` (Scenario 1)
- **Tables exist with `user_id` columns** = Use `SAFE_PROFILE_ID_UPDATE.sql` (Scenario 2)
- **Tables exist with `profile_id` columns** = You're already up to date! ✅

## 🛡️ **Safety Features**

Both scripts are designed to be **100% safe**:

### **CREATE_ENHANCED_VIBE_TABLES.sql:**
- ✅ Uses `CREATE TABLE IF NOT EXISTS` - won't overwrite existing tables
- ✅ Uses `IF NOT EXISTS` for indexes and policies
- ✅ Handles missing `proximity_events` table gracefully
- ✅ Creates everything with `profile_id` from the start

### **SAFE_PROFILE_ID_UPDATE.sql:**
- ✅ Checks if tables exist before attempting updates
- ✅ Preserves all existing data during migration
- ✅ Uses `IF EXISTS` checks for safe column operations
- ✅ Updates indexes, constraints, and policies correctly
- ✅ Provides detailed progress messages

## 📋 **Expected Output Messages**

### **Successful Fresh Setup:**
```
NOTICE: Enhanced proximity_events table with vibe context columns
NOTICE: === ENHANCED VIBE DETECTION TABLES CREATED ===
NOTICE: Created tables: vibe_system_metrics, vibe_user_learning, location_vibe_patterns
NOTICE: All tables use profile_id for user references
NOTICE: === READY FOR ENHANCED VIBE DETECTION ===
```

### **Successful Update:**
```
NOTICE: Updated vibe_system_metrics table to use profile_id
NOTICE: Updated vibe_user_learning table to use profile_id  
NOTICE: Updated location_vibe_patterns table to use profile_id
NOTICE: Updated get_user_vibe_insights function to use profile_id
NOTICE: === MIGRATION COMPLETE ===
NOTICE: Updated 3 enhanced vibe detection tables to use profile_id
NOTICE: === SAFE TO PROCEED ===
```

## 🎉 **After Migration**

Once you've successfully run the appropriate migration:

1. ✅ **All enhanced vibe detection tables use `profile_id`**
2. ✅ **RLS policies properly enforce user data isolation**
3. ✅ **Indexes are optimized for `profile_id` queries**
4. ✅ **Functions are updated to use `profile_id` parameters**
5. ✅ **Your app code will work seamlessly with the new schema**

## 🚨 **If Something Goes Wrong**

Both scripts are designed to be **idempotent** - you can run them multiple times safely. If you encounter any issues:

1. **Check the error message** in the SQL editor output
2. **Re-run the same script** - it will skip completed steps
3. **Contact support** if you need help interpreting errors

The scripts will never delete data or break existing functionality.