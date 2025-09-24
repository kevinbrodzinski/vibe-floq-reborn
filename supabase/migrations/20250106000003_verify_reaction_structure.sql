-- ============================================================================
-- Verification Script: dm_message_reactions Table Structure
-- Run this to confirm the exact structure before using toggle function
-- ============================================================================

-- Check the exact column structure of dm_message_reactions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'dm_message_reactions'
ORDER BY ordinal_position;

-- Check if there's an 'id' column or if it uses composite PK
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'dm_message_reactions'
AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY kcu.ordinal_position;

-- Check if reacted_at column exists (our functions assume it does)
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'dm_message_reactions'
AND column_name IN ('reacted_at', 'created_at');