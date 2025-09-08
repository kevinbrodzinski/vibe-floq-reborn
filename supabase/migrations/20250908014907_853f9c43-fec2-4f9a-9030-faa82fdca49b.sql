-- Simple group receipts table for plan decision auditing
CREATE TABLE IF NOT EXISTS public.group_receipts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL,
  profile_id    uuid NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_receipts_plan_ts
  ON public.group_receipts (plan_id, created_at DESC);

ALTER TABLE public.group_receipts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY IF NOT EXISTS "group_receipts_select" 
  ON public.group_receipts FOR SELECT 
  USING (true);

CREATE POLICY IF NOT EXISTS "group_receipts_insert" 
  ON public.group_receipts FOR INSERT 
  WITH CHECK (true);