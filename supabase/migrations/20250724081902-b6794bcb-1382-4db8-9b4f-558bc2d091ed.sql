-- 1. PLAN_STOPS extra columns  ---------------------------------------
ALTER TABLE IF EXISTS plan_stops
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

-- 2. PLAN_PARTICIPANTS composite PK ---------------------------------
-- drop referencing FKs first if any, or use CASCADE:
ALTER TABLE plan_participants
  DROP CONSTRAINT IF EXISTS plan_participants_pkey CASCADE;

ALTER TABLE plan_participants
  ADD CONSTRAINT plan_participants_pkey PRIMARY KEY (plan_id, user_id);

-- keep guests unique
CREATE UNIQUE INDEX IF NOT EXISTS plan_participants_guest_unique
  ON plan_participants(plan_id, id)         -- or guest_email
  WHERE user_id IS NULL;

-- 3. PLAN_ACTIVITIES + RLS ------------------------------------------
CREATE TABLE IF NOT EXISTS plan_activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES floq_plans(id) ON DELETE CASCADE,
  user_id      UUID,
  activity_type TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plan_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_ai_summaries_access" ON plan_activities;
CREATE POLICY "plan_activities_access"
  ON plan_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_participants pp
      WHERE pp.plan_id = plan_activities.plan_id
        AND pp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM floq_plans fp
      WHERE fp.id = plan_activities.plan_id
        AND fp.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service role full access" ON plan_activities;
CREATE POLICY "service role full access"
  ON plan_activities FOR ALL
  USING ( auth.role() = 'service_role' );

-- 4. ENUMs -----------------------------------------------------------
DO $$
BEGIN
  -- Create plan_mode_enum if missing
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='plan_mode_enum') THEN
     CREATE TYPE plan_mode_enum AS ENUM ('draft','finalized','done');
  END IF;

  -- Create floq_participant_role_enum if missing
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='floq_participant_role_enum') THEN
     CREATE TYPE floq_participant_role_enum AS ENUM ('creator','admin','member');
  ELSE
    -- add creator if missing from existing enum
    IF NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
       WHERE t.typname='floq_participant_role_enum' AND e.enumlabel='creator'
    ) THEN
       ALTER TYPE floq_participant_role_enum ADD VALUE 'creator';
    END IF;
  END IF;
END$$;

-- 5. BTREE indexes ---------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_id        ON plan_stops(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON plan_participants(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_activities_plan_id   ON plan_activities(plan_id);
CREATE INDEX IF NOT EXISTS idx_floq_participants_floq_user ON floq_participants(floq_id,user_id);