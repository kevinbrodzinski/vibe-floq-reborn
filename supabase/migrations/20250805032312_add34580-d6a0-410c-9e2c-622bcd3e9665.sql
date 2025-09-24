-- Apply database improvements based on review notes
-- This migration adds missing indexes and optimizations

BEGIN;

-- 1. Add composite index for better performance on plan_participants filtering
CREATE INDEX IF NOT EXISTS idx_plan_participants_pid_uid 
ON plan_participants(plan_id, profile_id);

-- 2. Ensure basic plan_id index exists  
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id 
ON plan_participants(plan_id);

-- 3. Update function signatures with improved comments
COMMENT ON FUNCTION public.get_floq_plans_enhanced(uuid) 
IS 'get_floq_plans_enhanced(p_profile_id uuid) - Returns plans the user participates in, with counts & RSVP status';

COMMENT ON FUNCTION public.create_group_plan_with_floq(text, text, timestamptz, timestamptz, text, text) 
IS 'create_group_plan_with_floq(...) - Creates a Floq + draft plan in one atomic call; returns both IDs';

COMMIT;