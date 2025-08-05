# SQL Migration Order

Run these migrations in the following order to avoid dependency issues:

## 1. Enhanced Location System (FIXED VERSION)
```bash
PGPASSWORD="KPb422$$$" psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/01_enhanced_location_system_fixed.sql
```

## 2. Rate Limiting System
```bash
PGPASSWORD="KPb422$$$" psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/add_rate_limiting_system.sql
```

## 3. Friend Request Race Conditions Fix
```bash
PGPASSWORD="KPb422$$$" psql -h db.reztyrrafsmlvvlqvsqt.supabase.co -p 5432 -U postgres -d postgres -f sql/fix_friend_request_race_conditions.sql
```

## 4. ✅ COMPLETE - No Database Migration Needed
The floq-plan system is already well-architected. Instead of database changes, we updated the frontend hooks to work with your existing schema.

## Notes:
- All migrations have been updated to use `profile_id` instead of `user_id`
- The enhanced location system migration has been fixed to work with your existing `proximity_events` table schema
- Each migration includes proper error handling and can be run safely multiple times