-- 1️⃣  Supporting enums
CREATE TYPE plan_status_enum AS ENUM ('draft','active','closed','cancelled');

-- 2️⃣  Plans table
CREATE TABLE public.floq_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id          UUID NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  creator_id       UUID NOT NULL REFERENCES auth.users(id),
  title            TEXT NOT NULL CHECK (char_length(title) <= 80),
  description      TEXT,
  planned_at       TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ,
  location         GEOGRAPHY(POINT,4326),          -- optional override
  max_participants INTEGER CHECK (max_participants >= 2),
  status           plan_status_enum DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 3️⃣  Participants (join table)
CREATE TABLE public.plan_participants (
  plan_id  UUID REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);

-- 4️⃣  Quick-lookup index for upcoming active plans
CREATE INDEX idx_floq_plans_active_upcoming 
ON public.floq_plans (floq_id, planned_at)
WHERE status = 'active';

-- 5️⃣  Row-level security
ALTER TABLE public.floq_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

-- a) any floq member can view plans in that floq
CREATE POLICY "plan_read"
ON public.floq_plans
FOR SELECT
TO authenticated
USING (user_is_floq_participant(floq_id));

-- b) creator or co-admin may insert / update / delete plans
CREATE POLICY "plan_manage_creator_admin"
ON public.floq_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.floq_participants p
    WHERE p.floq_id = floq_plans.floq_id
      AND p.user_id = auth.uid()
      AND p.role IN ('creator','co-admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.floq_participants p
    WHERE p.floq_id = floq_plans.floq_id
      AND p.user_id = auth.uid()
      AND p.role IN ('creator','co-admin')
  )
);

-- c) users manage their own participation
CREATE POLICY "pp_self_rw"
ON public.plan_participants
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- d) floq members can view plan participants
CREATE POLICY "plan_participants_read"
ON public.plan_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = plan_participants.plan_id
      AND user_is_floq_participant(fp.floq_id)
  )
);

-- 6️⃣  Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_floq_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_floq_plans_updated_at
  BEFORE UPDATE ON public.floq_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_floq_plans_updated_at();