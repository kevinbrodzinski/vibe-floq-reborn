-- RLS Security Policies Migration
-- Enable RLS and create comprehensive security policies for plan-related tables

/*───────────────────────────────────────────────
  FRIEND_SHARE_PREF
───────────────────────────────────────────────*/
ALTER TABLE public.friend_share_pref ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fsp_manage_self" ON public.friend_share_pref;

CREATE POLICY "fsp_manage_self"
ON public.friend_share_pref
FOR ALL
USING      (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

/*───────────────────────────────────────────────
  PLAN_CHECK_INS
───────────────────────────────────────────────*/
ALTER TABLE public.plan_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pci_select" ON public.plan_check_ins;
DROP POLICY IF EXISTS "pci_insert" ON public.plan_check_ins;
DROP POLICY IF EXISTS "pci_update" ON public.plan_check_ins;

-- see & filter (participant OR same-plan participant)
CREATE POLICY "pci_select"
ON public.plan_check_ins
FOR SELECT
USING (
  participant_id = auth.uid()          -- the row is mine
  OR EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_check_ins.plan_id
      AND pp.user_id = auth.uid()      -- I'm in that plan
  )
);

-- create my own check-ins
CREATE POLICY "pci_insert"
ON public.plan_check_ins
FOR INSERT
WITH CHECK (participant_id = auth.uid());

-- update my own check-ins
CREATE POLICY "pci_update"
ON public.plan_check_ins
FOR UPDATE
USING (participant_id = auth.uid());

/*───────────────────────────────────────────────
  PLAN_PARTICIPANTS
───────────────────────────────────────────────*/
ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_select"      ON public.plan_participants;
DROP POLICY IF EXISTS "pp_insert"      ON public.plan_participants;

-- anyone in the plan can see the participant list
CREATE POLICY "pp_select"
ON public.plan_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_participants.plan_id
      AND pp.user_id = auth.uid()
  )
);

-- plan creator can add; users can add themselves
CREATE POLICY "pp_insert"
ON public.plan_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.floq_plans p
    WHERE p.id = plan_participants.plan_id
      AND p.creator_id = auth.uid()
  )
);

/*───────────────────────────────────────────────
  PLAN_COMMENTS
───────────────────────────────────────────────*/
ALTER TABLE public.plan_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_select"  ON public.plan_comments;
DROP POLICY IF EXISTS "pc_insert"  ON public.plan_comments;

CREATE POLICY "pc_select"
ON public.plan_comments
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_comments.plan_id
      AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "pc_insert"
ON public.plan_comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_comments.plan_id
      AND pp.user_id = auth.uid()
  )
);

/*───────────────────────────────────────────────
  PLAN_STOPS
───────────────────────────────────────────────*/
ALTER TABLE public.plan_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ps_select"  ON public.plan_stops;
DROP POLICY IF EXISTS "ps_all"     ON public.plan_stops;

-- participants can read
CREATE POLICY "ps_select"
ON public.plan_stops
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_stops.plan_id
      AND pp.user_id = auth.uid()
  )
);

-- creator can do anything (insert/update/delete)
CREATE POLICY "ps_all"
ON public.plan_stops
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.floq_plans p
    WHERE p.id = plan_stops.plan_id
      AND p.creator_id = auth.uid()
  )
)
WITH CHECK (TRUE);   -- same condition as USING

/*───────────────────────────────────────────────
  PLAN_ACTIVITIES
───────────────────────────────────────────────*/
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pa_select" ON public.plan_activities;
DROP POLICY IF EXISTS "pa_insert" ON public.plan_activities;

CREATE POLICY "pa_select"
ON public.plan_activities
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_activities.plan_id
      AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "pa_insert"
ON public.plan_activities
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = plan_activities.plan_id
      AND pp.user_id = auth.uid()
  )
);