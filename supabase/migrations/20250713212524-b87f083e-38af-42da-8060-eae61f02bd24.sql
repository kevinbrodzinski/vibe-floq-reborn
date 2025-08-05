-- Enhanced delete_floq migration with user feedback incorporated

-- 1. Add deleted_at column to floqs table (idempotent)
ALTER TABLE public.floqs 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- 2. Create partial index with CONCURRENTLY to avoid write-lock in production
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_active_only 
ON public.floqs (created_at DESC, activity_score DESC) 
WHERE deleted_at IS NULL;

-- 3. Update existing SELECT policies to exclude deleted floqs
DROP POLICY IF EXISTS "Floqs: read nearby public" ON public.floqs;
CREATE POLICY "Floqs: read nearby public" 
ON public.floqs 
FOR SELECT 
USING (
  (visibility = 'public'::text) 
  AND (ends_at > now() OR ends_at IS NULL) -- Handle persistent floqs
  AND (deleted_at IS NULL) -- Exclude deleted floqs
);

-- Add catch-all demo policy guard  
DROP POLICY IF EXISTS "demo_floqs_public_read_active" ON public.floqs;
CREATE POLICY "demo_floqs_public_read_active" 
ON public.floqs 
FOR SELECT 
USING (deleted_at IS NULL);

-- 4. Prevent resurrection - UPDATE policy with unique name and proper USING predicate
DROP POLICY IF EXISTS "floqs_no_resurrect" ON public.floqs;
CREATE POLICY "floqs_no_resurrect"
ON public.floqs
FOR UPDATE
USING (creator_id = auth.uid()) -- Honor existing update rules
WITH CHECK (deleted_at IS NULL); -- Prevent resurrection

-- 5. Create delete_floq function with all recommendations
CREATE OR REPLACE FUNCTION public.delete_floq(
  p_floq_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_floq public.floqs;
  participant_count INTEGER;
BEGIN
  -- Validate user is creator and floq exists
  SELECT * INTO result_floq 
  FROM public.floqs 
  WHERE id = p_floq_id 
    AND creator_id = auth.uid()
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Floq not found or you are not the creator'
    );
  END IF;

  -- Check participant count for safety
  SELECT COUNT(*) INTO participant_count
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id;

  -- Only allow delete when solo or already ended
  IF participant_count > 1 AND (result_floq.ends_at IS NULL OR result_floq.ends_at > now()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete active floq with multiple participants'
    );
  END IF;

  -- Soft delete the floq
  UPDATE public.floqs
  SET deleted_at = now()
  WHERE id = p_floq_id
  RETURNING * INTO result_floq;

  -- Log the deletion event
  INSERT INTO public.flock_history (floq_id, user_id, event_type, metadata)
  VALUES (
    p_floq_id, 
    auth.uid(), 
    'ended'::flock_event_type_enum,
    jsonb_build_object(
      'reason', 'deleted', 
      'deleted_at', now(),
      'participant_count', participant_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'floq_id', result_floq.id,
    'deleted_at', result_floq.deleted_at
  );
END;
$$;

-- 6. Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.delete_floq(uuid) TO authenticated;