-- ──────────────────────────────────────────────────────────────
-- Add index for optimized plan stop ordering by plan
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_order 
ON public.plan_stops (plan_id, stop_order);

-- ──────────────────────────────────────────────────────────────
-- Create plan_drafts table for auto-save functionality
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- Enable RLS for plan_drafts
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.plan_drafts ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- RLS Policy: Users can manage their own plan drafts
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "Users can manage their own plan drafts"
ON public.plan_drafts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- Trigger: Auto-update last_saved_at on update
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_plan_drafts_last_saved_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_saved_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_last_saved_at
BEFORE UPDATE ON public.plan_drafts
FOR EACH ROW
EXECUTE FUNCTION public.set_plan_drafts_last_saved_at();