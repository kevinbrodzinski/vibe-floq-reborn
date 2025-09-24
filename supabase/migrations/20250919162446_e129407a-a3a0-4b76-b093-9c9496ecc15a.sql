-- Create learned_preferences table for AI-learned user preferences
BEGIN;

-- Helper function to get current profile_id (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT auth.uid()
$$;

-- Learned preferences table
CREATE TABLE IF NOT EXISTS public.learned_preferences (
  profile_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preference_type text NOT NULL,                    -- e.g. 'venue_type_thresholds', 'time_rule', etc.
  conditions      jsonb NOT NULL,                   -- when this applies
  preference      jsonb NOT NULL,                   -- the learned preference payload
  confidence      double precision NOT NULL DEFAULT 0,
  support         integer NOT NULL DEFAULT 0,
  last_updated    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, preference_type)
);

-- Enable RLS
ALTER TABLE public.learned_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "lp_select_owner"
ON public.learned_preferences
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "lp_upsert_owner"
ON public.learned_preferences
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "lp_update_owner"
ON public.learned_preferences
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Convenience upsert function
CREATE OR REPLACE FUNCTION public.upsert_learned_preference(
  p_type text,
  p_conditions jsonb,
  p_preference jsonb,
  p_confidence double precision,
  p_support integer
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE v_profile uuid;
BEGIN
  v_profile := auth.uid();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'No profile for current user';
  END IF;

  INSERT INTO public.learned_preferences(profile_id, preference_type, conditions, preference, confidence, support, last_updated)
  VALUES (v_profile, p_type, p_conditions, p_preference, p_confidence, p_support, now())
  ON CONFLICT (profile_id, preference_type)
  DO UPDATE SET
    conditions   = EXCLUDED.conditions,
    preference   = EXCLUDED.preference,
    confidence   = EXCLUDED.confidence,
    support      = EXCLUDED.support,
    last_updated = now();
END
$$;

COMMIT;