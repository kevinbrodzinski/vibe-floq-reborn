-- Update user_floq_unread_counts view with cleaner implementation
-- Remove unnecessary RLS policy and improve deduplication

-- Drop the old view
DROP VIEW IF EXISTS public.user_floq_unread_counts;

-- Create the cleaned-up view with DISTINCT and better comments
CREATE OR REPLACE VIEW public.user_floq_unread_counts AS
SELECT DISTINCT
  u.id    AS user_id,
  f.id    AS floq_id,
  0       AS unread_chat,     -- TODO: replace with subquery on floq_messages
  0       AS unread_activity, -- TODO: replace with subquery on flock_history  
  0       AS unread_plans,    -- TODO: replace with subquery on floq_plans
  0       AS unread_total     -- TODO: sum of above counts
FROM auth.users           u
JOIN public.floq_participants fp ON fp.user_id = u.id
JOIN public.floqs        f  ON f.id = fp.floq_id
WHERE f.deleted_at IS NULL
  AND fp.user_id = auth.uid();  -- security filter enforces user can only see their own rows

-- Grant access to authenticated users
GRANT SELECT ON public.user_floq_unread_counts TO authenticated;