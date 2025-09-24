-- ============================================================================
-- Database Audit Script - Understanding Current P2P System State
-- Run this FIRST to understand what already exists
-- ============================================================================

-- Check existing functions related to P2P systems
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (
    routine_name LIKE '%friend%' OR 
    routine_name LIKE '%dm%' OR 
    routine_name LIKE '%reaction%' OR
    routine_name LIKE '%thread%' OR
    routine_name LIKE '%message%'
)
ORDER BY routine_name;

-- Check existing RLS policies on P2P tables
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'dm_message_reactions',
    'dm_media', 
    'direct_messages',
    'direct_threads',
    'friend_requests',
    'friendships'
)
ORDER BY tablename, policyname;

-- Check existing indexes on P2P tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'dm_message_reactions',
    'dm_media',
    'direct_messages', 
    'direct_threads',
    'friend_requests',
    'friendships'
)
ORDER BY tablename, indexname;

-- Check existing views related to P2P
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (
    table_name LIKE '%reaction%' OR
    table_name LIKE '%dm%' OR
    table_name LIKE '%friend%' OR
    table_name LIKE '%thread%' OR
    table_name LIKE '%message%'
)
ORDER BY table_name;

-- Check table structures for P2P tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'dm_message_reactions',
    'dm_media',
    'direct_messages',
    'direct_threads', 
    'friend_requests',
    'friendships'
)
ORDER BY table_name, ordinal_position;

-- Check constraints on P2P tables
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN (
    'dm_message_reactions',
    'dm_media',
    'direct_messages',
    'direct_threads',
    'friend_requests', 
    'friendships'
)
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;