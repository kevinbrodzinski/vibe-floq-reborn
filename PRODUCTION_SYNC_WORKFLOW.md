# Production Database Sync Workflow

## 🎯 **Project: `reztyrrafsmlvvlqvsqt`**

### **Workflow Overview**

1. **Local Development** → You make changes with me
2. **SQL Generation** → I provide SQL for database changes
3. **Production Application** → You apply SQL directly to production
4. **Type Sync** → Generate types from production schema
5. **Frontend Updates** → Update frontend to match production

---

## 🔄 **Step-by-Step Workflow**

### **1. Local Development Session**
```bash
# Start local environment (for development only)
./scripts/db-sync.sh start

# Make changes with AI assistant
# ... we work on features together ...
```

### **2. SQL Generation**
When we need database changes, I'll provide SQL like this:

```sql
-- Example: Add new table for enhanced profiles
CREATE TABLE IF NOT EXISTS enhanced_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  interests TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE enhanced_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enhanced profile" ON enhanced_profiles
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own enhanced profile" ON enhanced_profiles
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own enhanced profile" ON enhanced_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());
```

### **3. Production Application**
You apply the SQL directly to production:

```bash
# Option A: Apply via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard/project/reztyrrafsmlvvlqvsqt
# 2. Navigate to SQL Editor
# 3. Paste and run the SQL

# Option B: Apply via Supabase CLI
supabase db push --project-id reztyrrafsmlvvlqvsqt
```

### **4. Sync Types from Production**
```bash
# Generate types from production schema
./scripts/db-sync.sh types

# This updates src/types/database.ts with production schema
```

### **5. Update Frontend**
```bash
# Type check to ensure compatibility
npm run typecheck

# Test the new functionality
npm run dev
```

---

## 📋 **SQL Templates for Common Changes**

### **Adding New Tables**
```sql
-- Template for new table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- Add your columns here
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (profile_id = auth.uid());
```

### **Adding New Columns**
```sql
-- Template for adding columns
ALTER TABLE existing_table 
ADD COLUMN new_column_name TEXT,
ADD COLUMN another_column BOOLEAN DEFAULT false;
```

### **Creating Indexes**
```sql
-- Template for performance indexes
CREATE INDEX idx_table_profile_id ON table_name(profile_id);
CREATE INDEX idx_table_created_at ON table_name(created_at);
```

### **Updating Existing Data**
```sql
-- Template for data migrations
UPDATE table_name 
SET new_column = 'default_value' 
WHERE new_column IS NULL;
```

---

## 🛠️ **Development Commands**

### **Quick Sync Commands**
```bash
# Pull latest production schema
./scripts/db-sync.sh pull

# Generate types from production
./scripts/db-sync.sh types

# Check for type errors
npm run typecheck

# Start development server
npm run dev
```

### **Production Monitoring**
```bash
# Check production logs
./scripts/db-sync.sh logs

# Monitor database performance
# Use Supabase Dashboard Analytics
```

---

## 📝 **Workflow Examples**

### **Example 1: Adding User Preferences**
1. **Local Development**: We create a preferences component
2. **SQL Generation**: I provide SQL for preferences table
3. **Production Application**: You apply SQL to production
4. **Type Sync**: Generate types from production
5. **Frontend Update**: Update component to use new schema

### **Example 2: Adding Friend System**
1. **Local Development**: We create friend request components
2. **SQL Generation**: I provide SQL for friends table
3. **Production Application**: You apply SQL to production
4. **Type Sync**: Generate types from production
5. **Frontend Update**: Update components to use new schema

---

## 🚨 **Important Notes**

### **No Mock Data**
- All development uses production data structure
- No separate development database
- All changes go directly to production

### **Safety Measures**
- Always backup before major changes
- Test SQL in Supabase Dashboard first
- Use `IF NOT EXISTS` for table creation
- Use proper RLS policies for security

### **Type Safety**
- Always run `npm run typecheck` after schema changes
- Update TypeScript interfaces if needed
- Test with real production data

---

## 📊 **Monitoring Production**

### **Database Health**
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Check recent activity
SELECT * FROM pg_stat_activity 
WHERE state = 'active' 
AND query NOT LIKE '%pg_stat_activity%';
```

### **Performance Monitoring**
- Use Supabase Dashboard for real-time metrics
- Monitor query performance
- Check for slow queries
- Monitor connection limits

This workflow keeps everything in sync with production while maintaining safety and type safety! 