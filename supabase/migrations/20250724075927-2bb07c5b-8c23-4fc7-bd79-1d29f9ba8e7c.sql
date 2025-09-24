-- ────────────────────────────────────────────────────────────
-- Phase 3: AI Recap + Finishing Flow
-- ────────────────────────────────────────────────────────────

-- 1. Table for storing AI-generated plan summaries
CREATE TABLE IF NOT EXISTS plan_ai_summaries (
  plan_id UUID PRIMARY KEY REFERENCES floq_plans(id) ON DELETE CASCADE,
  summary_md TEXT,
  suggestions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for efficient status polling
CREATE INDEX IF NOT EXISTS idx_plan_ai_summaries_status
  ON plan_ai_summaries(status);

-- 3. RLS policies (inherit from floq_plans access)
ALTER TABLE plan_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_ai_summaries_access" ON plan_ai_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM floq_plans fp 
      WHERE fp.id = plan_ai_summaries.plan_id 
      AND (fp.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM plan_participants pp 
        WHERE pp.plan_id = fp.id AND pp.user_id = auth.uid()
      ))
    )
  );

-- 4. Add finished_at column to floq_plans
ALTER TABLE floq_plans 
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- 5. Finish Plan RPC Function
CREATE OR REPLACE FUNCTION public.finish_plan(
  p_plan_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  plan_row floq_plans%ROWTYPE;
BEGIN
  -- Verify ownership/access
  SELECT * INTO plan_row 
  FROM floq_plans 
  WHERE id = p_plan_id 
  AND (creator_id = p_user_id OR EXISTS (
    SELECT 1 FROM plan_participants pp 
    WHERE pp.plan_id = p_plan_id AND pp.user_id = p_user_id
  ));
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or access denied';
  END IF;
  
  -- Check if already finished
  IF plan_row.plan_mode = 'done' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Plan already finished');
  END IF;
  
  -- Mark plan as finished
  UPDATE floq_plans
  SET 
    plan_mode = 'done',
    finished_at = now(),
    updated_at = now()
  WHERE id = p_plan_id;
  
  -- Disband auto-disband floqs
  UPDATE floqs f
  SET 
    archived_at = now(),
    updated_at = now()
  FROM plan_floqs pf
  WHERE pf.plan_id = p_plan_id
    AND pf.floq_id = f.id
    AND pf.auto_disband = true
    AND f.archived_at IS NULL;
  
  -- Log completion activity
  INSERT INTO plan_activities (plan_id, user_id, activity_type, metadata)
  VALUES (
    p_plan_id, 
    p_user_id, 
    'plan_finished',
    jsonb_build_object('finished_at', now())
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Plan finished successfully',
    'finished_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finish_plan(UUID, UUID) TO authenticated;