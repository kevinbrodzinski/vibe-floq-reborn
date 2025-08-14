-- ================================================================
-- FLOQ PLAN SYSTEM - COMPLETE DATABASE SCHEMA ANALYSIS
-- Run these queries to extract all plan-related structures
-- ================================================================

-- ================================================================
-- 1. CORE PLAN TABLES
-- ================================================================

-- Get floq_plans table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'floq_plans'
ORDER BY ordinal_position;

-- Get plan_stops table structure  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_stops'
ORDER BY ordinal_position;

-- Get plan_participants table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_participants'
ORDER BY ordinal_position;

-- ================================================================
-- 2. PLAN-RELATED SUPPORT TABLES
-- ================================================================

-- Get plan_votes table structure (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_votes'
ORDER BY ordinal_position;

-- Get plan_activities table structure (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_activities'
ORDER BY ordinal_position;

-- Get plan_invitations table structure (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_invitations'
ORDER BY ordinal_position;

-- Get plan_ai_summaries table structure (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_ai_summaries'
ORDER BY ordinal_position;

-- Get plan_floqs table structure (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'plan_floqs'
ORDER BY ordinal_position;

-- ================================================================
-- 3. ALL PLAN-RELATED TABLES DISCOVERY
-- ================================================================

-- Find all tables with 'plan' in the name
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%plan%'
ORDER BY table_name;

-- ================================================================
-- 4. PLAN-RELATED VIEWS
-- ================================================================

-- Find all views with 'plan' in the name
SELECT 
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE '%plan%'
ORDER BY table_name;

-- Get v_user_plans view structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'v_user_plans'
ORDER BY ordinal_position;

-- ================================================================
-- 5. FOREIGN KEY RELATIONSHIPS
-- ================================================================

-- Get all foreign keys FROM plan tables
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE '%plan%'
ORDER BY tc.table_name, kcu.column_name;

-- Get all foreign keys TO plan tables
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND ccu.table_name LIKE '%plan%'
ORDER BY tc.table_name, kcu.column_name;

-- ================================================================
-- 6. INDEXES ON PLAN TABLES
-- ================================================================

-- Get all indexes on plan-related tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename LIKE '%plan%'
ORDER BY tablename, indexname;

-- ================================================================
-- 7. PLAN-RELATED ENUMS
-- ================================================================

-- Get all custom enums that might be plan-related
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%plan%' 
   OR t.typname LIKE '%status%'
   OR t.typname LIKE '%mode%'
ORDER BY t.typname, e.enumsortorder;

-- ================================================================
-- 8. PLAN-RELATED FUNCTIONS AND PROCEDURES
-- ================================================================

-- Get all functions with 'plan' in the name
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%plan%'
ORDER BY routine_name;

-- ================================================================
-- 9. RLS POLICIES ON PLAN TABLES
-- ================================================================

-- Get RLS policies for plan tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE '%plan%'
ORDER BY tablename, policyname;

-- ================================================================
-- 10. TRIGGERS ON PLAN TABLES
-- ================================================================

-- Get all triggers on plan tables
SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table LIKE '%plan%'
ORDER BY event_object_table, trigger_name;

-- ================================================================
-- 11. SAMPLE DATA ANALYSIS
-- ================================================================

-- Count records in each plan table
SELECT 'floq_plans' as table_name, COUNT(*) as record_count FROM floq_plans
UNION ALL
SELECT 'plan_stops' as table_name, COUNT(*) as record_count FROM plan_stops
UNION ALL
SELECT 'plan_participants' as table_name, COUNT(*) as record_count FROM plan_participants;

-- Get sample plan statuses
SELECT 
    status,
    COUNT(*) as count
FROM floq_plans 
GROUP BY status
ORDER BY count DESC;

-- Get plan creation timeline (last 30 days)
SELECT 
    DATE(created_at) as creation_date,
    COUNT(*) as plans_created
FROM floq_plans 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- ================================================================
-- 12. PLAN COMPLEXITY ANALYSIS
-- ================================================================

-- Analyze plan stop distribution
SELECT 
    p.id as plan_id,
    p.title,
    p.status,
    COUNT(ps.id) as stop_count,
    COUNT(pp.profile_id) as participant_count
FROM floq_plans p
LEFT JOIN plan_stops ps ON p.id = ps.plan_id
LEFT JOIN plan_participants pp ON p.id = pp.plan_id
GROUP BY p.id, p.title, p.status
ORDER BY stop_count DESC, participant_count DESC
LIMIT 20;

-- ================================================================
-- END OF ANALYSIS QUERIES
-- ================================================================