-- ==============================================
-- Add RLS policy for direct_threads access
-- ==============================================

-- Allow a profile to read its own DM threads
CREATE POLICY IF NOT EXISTS pol_dm_threads_select
ON public.direct_threads
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  (
    member_a_profile_id = auth.uid()::uuid OR
    member_b_profile_id = auth.uid()::uuid
  )
);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';