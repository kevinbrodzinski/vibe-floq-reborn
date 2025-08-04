# SQL Migration Order

Run these migrations in the following order to avoid dependency issues:

## 1. Enhanced Location System
**File:** `sql/01_enhanced_location_system.sql`
**Purpose:** Creates geofencing, venue detection, and proximity tracking tables
**Dependencies:** Requires `public.profiles` table (✅ exists)

```bash
psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/01_enhanced_location_system.sql
```

## 2. Rate Limiting System
**File:** `sql/02_add_rate_limiting_system.sql`
**Purpose:** Creates rate limiting tables and enhanced friend request functions
**Dependencies:** Requires `public.profiles` table (✅ exists)

```bash
psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/02_add_rate_limiting_system.sql
```

## 3. Friend Request Race Condition Fixes
**File:** `sql/03_fix_friend_request_race_conditions.sql`
**Purpose:** Creates atomic friend request functions
**Dependencies:** Requires `public.profiles`, `public.friend_requests`, `public.friendships` tables and `upsert_friendship` function

```bash
psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/03_fix_friend_request_race_conditions.sql
```

## 4. Floq-Plan Integration
**File:** `sql/04_improve_floq_plan_integration.sql`
**Purpose:** Enhances floq and plan integration with automatic synchronization
**Dependencies:** Requires `public.profiles`, `public.floqs`, `public.floq_participants`, `public.floq_plans`, `public.plan_participants` tables

```bash
psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/04_improve_floq_plan_integration.sql
```

## Key Changes Made

All migration files have been updated to:
- ✅ Use `profile_id` instead of `user_id`
- ✅ Reference `public.profiles(id)` for foreign keys
- ✅ Use `auth.uid()` for RLS policies
- ✅ Maintain compatibility with existing project schema

## If You Encounter Errors

1. **Check dependencies**: Make sure the required tables exist before running each migration
2. **Run one at a time**: Execute each migration separately and check for errors
3. **Check permissions**: Ensure your database user has the necessary permissions

## Verification Commands

After running all migrations, verify with:

```sql
-- Check new tables were created
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'geofences', 'geofence_data', 'venue_signatures', 'venue_boundaries', 
  'proximity_events', 'proximity_stats', 'user_action_limits', 'rate_limit_config'
);

-- Check new functions were created
SELECT proname FROM pg_proc WHERE proname LIKE '%rate_limit%' OR proname LIKE '%geofence%' OR proname LIKE '%proximity%';
```