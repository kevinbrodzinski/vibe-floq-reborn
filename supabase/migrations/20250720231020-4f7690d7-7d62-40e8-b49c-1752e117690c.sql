-- =============================================
-- ✅ MIGRATION: Update plan schema with voting, ordering, and guest support
-- 📅 Timestamp: 20250720230832
-- =============================================

-- === Phase 1: Foreign Key and Indexes ===

-- 1. Add foreign key constraint for plan_participants.user_id
ALTER TABLE public.plan_participants 
ADD CONSTRAINT IF NOT EXISTS fk_plan_participants_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON public.plan_participants(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_user_id ON public.plan_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_id_order ON public.plan_stops(plan_id, stop_order);

-- 3. Add stop_order column to plan_stops
ALTER TABLE public.plan_stops 
ADD COLUMN IF NOT EXISTS stop_order INTEGER DEFAULT 0;

-- === Phase 2: Reorder RPC ===

CREATE OR REPLACE FUNCTION public.reorder_plan_stops(
  p_plan_id UUID,
  p_stop_ids UUID[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_stop_ids IS NULL OR array_length(p_stop_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No stop IDs provided';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plan_participants pp
    WHERE pp.plan_id = p_plan_id AND pp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to this plan';
  END IF;

  FOR i IN 1..array_length(p_stop_ids, 1) LOOP
    UPDATE plan_stops 
    SET stop_order = i
    WHERE id = p_stop_ids[i] AND plan_id = p_plan_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_plan_stops(UUID, UUID[]) TO authenticated;

-- === Phase 3: Update RLS Policies ===

DROP POLICY IF EXISTS plan_participants_select ON public.plan_participants;
CREATE POLICY plan_participants_select 
ON public.plan_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM plan_participants pp2 
    WHERE pp2.plan_id = plan_participants.plan_id 
    AND (pp2.user_id = auth.uid() OR pp2.is_guest = true)
  )
  OR 
  EXISTS (
    SELECT 1 FROM plan_share_links psl
    JOIN floq_plans fp ON fp.id = psl.plan_id
    WHERE fp.id = plan_participants.plan_id
  )
);

-- === Phase 4: Create plan_stop_votes Table ===

CREATE TABLE IF NOT EXISTS public.plan_stop_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  stop_id UUID NOT NULL,
  user_id UUID,
  guest_id UUID,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'maybe')),
  emoji_reaction TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(stop_id, user_id),
  UNIQUE(stop_id, guest_id),

  CHECK ((user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL))
);

-- === Phase 5: RLS for plan_stop_votes ===

ALTER TABLE public.plan_stop_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_stop_votes_select ON public.plan_stop_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM plan_participants pp
    WHERE pp.plan_id = plan_stop_votes.plan_id
    AND (pp.user_id = auth.uid() OR pp.is_guest = true)
  )
);

CREATE POLICY plan_stop_votes_insert ON public.plan_stop_votes FOR INSERT
WITH CHECK (
  (user_id = auth.uid() OR guest_id IS NOT NULL) AND
  EXISTS (
    SELECT 1 FROM plan_participants pp
    WHERE pp.plan_id = plan_stop_votes.plan_id
    AND (pp.user_id = auth.uid() OR pp.is_guest = true)
  )
);

CREATE POLICY plan_stop_votes_update ON public.plan_stop_votes FOR UPDATE
USING (
  user_id = auth.uid() OR guest_id IS NOT NULL
)
WITH CHECK (
  user_id = auth.uid() OR guest_id IS NOT NULL
);