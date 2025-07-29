# Database Sync Strategy for User ID Migration

## 🎯 **Project: `reztyrrafsmlvvlqvsqt`**

### **1. Local Development Workflow**

#### **A. Start Local Supabase**
```bash
# Start local development
supabase start

# Check status
supabase status

# Get local credentials
supabase status --output json
```

#### **B. Sync Remote Schema to Local**
```bash
# Pull latest schema from remote
supabase db pull

# This creates a new migration file with current remote state
```

#### **C. Apply Your Migration**
```bash
# Create your user_id → profile_id migration
supabase migration new rename_user_id_to_profile_id

# Edit the generated migration file in supabase/migrations/
# Add your ALTER TABLE statements
```

### **2. Migration Workflow**

#### **Step 1: Create Migration File**
```sql
-- supabase/migrations/[timestamp]_rename_user_id_to_profile_id.sql

-- Example migration structure:
-- 1. Add new profile_id columns
-- 2. Copy data from user_id to profile_id
-- 3. Update foreign key constraints
-- 4. Drop old user_id columns
-- 5. Rename profile_id to user_id (if desired)

-- Example:
ALTER TABLE profiles ADD COLUMN profile_id UUID;
UPDATE profiles SET profile_id = user_id;
ALTER TABLE profiles DROP COLUMN user_id;
ALTER TABLE profiles RENAME COLUMN profile_id TO user_id;
```

#### **Step 2: Test Locally**
```bash
# Apply migration to local database
supabase db reset

# Test your application
npm run dev
```

#### **Step 3: Deploy to Remote**
```bash
# Push migration to remote
supabase db push

# Or deploy specific migration
supabase migration up
```

### **3. Type Generation**

#### **A. Generate Types After Schema Changes**
```bash
# Generate TypeScript types
supabase gen types typescript --project-id reztyrrafsmlvvlqvsqt > src/types/database.ts

# Or for local development
supabase gen types typescript --local > src/types/database.ts
```

#### **B. Update Frontend Types**
```bash
# After schema changes, regenerate types
npm run typecheck
```

### **4. Sync Strategies**

#### **Strategy A: Development → Staging → Production**
```bash
# 1. Local development
supabase start
# Make changes locally

# 2. Push to staging
supabase db push --project-id [staging-project-id]

# 3. Push to production
supabase db push --project-id reztyrrafsmlvvlqvsqt
```

#### **Strategy B: Direct Production (for small changes)**
```bash
# 1. Pull current production schema
supabase db pull --project-id reztyrrafsmlvvlqvsqt

# 2. Create migration
supabase migration new user_id_migration

# 3. Test locally
supabase db reset

# 4. Deploy to production
supabase db push --project-id reztyrrafsmlvvlqvsqt
```

### **5. Rollback Strategy**

#### **A. Database Rollback**
```bash
# Revert last migration
supabase migration down

# Or reset to specific migration
supabase db reset --db-url [your-db-url]
```

#### **B. Frontend Rollback**
```bash
# Revert frontend changes
git revert [commit-hash]

# Or manually revert the migration scripts
```

### **6. Monitoring & Validation**

#### **A. Check Migration Status**
```bash
# List applied migrations
supabase migration list

# Check migration status
supabase db diff
```

#### **B. Validate Schema**
```bash
# Compare local vs remote
supabase db diff --project-id reztyrrafsmlvvlqvsqt

# Generate schema report
supabase db dump --schema-only
```

### **7. Best Practices**

#### **A. Migration Safety**
- ✅ Always test migrations locally first
- ✅ Use transactions for complex migrations
- ✅ Backup production data before major changes
- ✅ Deploy during low-traffic periods

#### **B. Type Safety**
- ✅ Regenerate types after schema changes
- ✅ Run `npm run typecheck` after type updates
- ✅ Update frontend code to match new schema

#### **C. Deployment**
- ✅ Use staging environment when possible
- ✅ Monitor application logs after deployment
- ✅ Have rollback plan ready

### **8. Troubleshooting**

#### **A. Local Issues**
```bash
# Reset local database
supabase db reset

# Restart local services
supabase stop
supabase start

# Check logs
supabase logs
```

#### **B. Remote Issues**
```bash
# Check remote status
supabase status --project-id reztyrrafsmlvvlqvsqt

# View remote logs
supabase logs --project-id reztyrrafsmlvvlqvsqt
```

### **9. Migration Checklist**

#### **Before Deployment**
- [ ] Test migration locally
- [ ] Update frontend types
- [ ] Run full test suite
- [ ] Backup production data
- [ ] Notify team of deployment

#### **During Deployment**
- [ ] Deploy database migration
- [ ] Deploy frontend changes
- [ ] Monitor application health
- [ ] Check error logs

#### **After Deployment**
- [ ] Verify data integrity
- [ ] Test critical user flows
- [ ] Monitor performance
- [ ] Update documentation

### **10. Emergency Procedures**

#### **A. Quick Rollback**
```bash
# Revert database migration
supabase migration down --project-id reztyrrafsmlvvlqvsqt

# Revert frontend deployment
git revert [commit-hash]
```

#### **B. Data Recovery**
```bash
# Restore from backup
supabase db reset --db-url [backup-url]

# Or restore specific tables
pg_restore [backup-file]
``` 