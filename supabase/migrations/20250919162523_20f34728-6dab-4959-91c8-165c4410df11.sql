-- Create group_predictability_log table for tracking group planning decisions
BEGIN;

CREATE TABLE IF NOT EXISTS public.group_predictability_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- who wrote the row
  group_id     uuid NOT NULL,                                                   -- your app's group/floq id
  ts           timestamptz NOT NULL DEFAULT now(),
  omega_g      double precision NOT NULL,
  p_g          double precision NOT NULL,
  gate_passed  boolean NOT NULL,
  fallback     text,                      -- 'partition' | 'relax_constraints' | null
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gpl_profile_ts ON public.group_predictability_log(profile_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_gpl_group_ts   ON public.group_predictability_log(group_id, ts DESC);

-- Enable RLS
ALTER TABLE public.group_predictability_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "gpl_select_owner"
ON public.group_predictability_log
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "gpl_insert_owner"
ON public.group_predictability_log
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Optional delete for RTBF
CREATE POLICY "gpl_delete_owner"
ON public.group_predictability_log
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

COMMIT;