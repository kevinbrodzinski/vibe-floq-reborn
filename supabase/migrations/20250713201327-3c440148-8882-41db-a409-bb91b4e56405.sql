-- Persistent floqs implementation migration

-- 1. Add enum value if not exists
ALTER TYPE flock_type_enum ADD VALUE IF NOT EXISTS 'persistent';

-- 2. Allow NULL ends_at
ALTER TABLE public.floqs ALTER COLUMN ends_at DROP NOT NULL;

-- 3. Back-fill existing floqs with NULL ends_at BEFORE adding constraint
UPDATE public.floqs
SET flock_type = 'persistent'
WHERE ends_at IS NULL
  AND flock_type <> 'persistent';

-- 4. Add integrity constraint (deferred validation for large tables)
ALTER TABLE public.floqs
  ADD CONSTRAINT IF NOT EXISTS ck_flock_type_ends_at
  CHECK (
    (flock_type = 'persistent' AND ends_at IS NULL) OR
    (flock_type = 'momentary'  AND ends_at IS NOT NULL)
  ) NOT VALID;

-- 4b. Validate constraint after backfill
ALTER TABLE public.floqs
  VALIDATE CONSTRAINT ck_flock_type_ends_at;

-- 5. Partial index for performance (using regular CREATE INDEX due to transaction block)
CREATE INDEX IF NOT EXISTS idx_floqs_active_momentary
  ON public.floqs (activity_score DESC)
  WHERE flock_type = 'momentary'
    AND ends_at IS NOT NULL;

-- 6. Function to end persistent floqs
CREATE OR REPLACE FUNCTION public.end_floq(
  p_floq_id uuid,
  p_reason text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result_floq public.floqs;
BEGIN
  UPDATE public.floqs
  SET 
    ends_at = now(),
    flock_type = 'momentary'
  WHERE id = p_floq_id
    AND creator_id = auth.uid()
    AND ends_at IS NULL  -- persistent only
  RETURNING * INTO result_floq;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Floq not found or you are not the host'
    );
  END IF;

  -- Log the end event
  INSERT INTO public.flock_history (floq_id, user_id, event_type, metadata)
  VALUES (
    p_floq_id, 
    auth.uid(), 
    'ended',
    jsonb_build_object('reason', p_reason, 'ended_at', now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'floq_id', result_floq.id,
    'ended_at', result_floq.ends_at
  );
END;
$$;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.end_floq(uuid, text) TO authenticated;