-- Create missing RPC function for preference signals
BEGIN;

-- Create preference_signals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.preference_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  signal jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.preference_signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "preference_signals_select_own" ON public.preference_signals;
DROP POLICY IF EXISTS "preference_signals_insert_own" ON public.preference_signals;

CREATE POLICY "preference_signals_select_own"
ON public.preference_signals
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "preference_signals_insert_own"
ON public.preference_signals
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Create the missing RPC function
CREATE OR REPLACE FUNCTION public.record_preference_signal(
  p_signal jsonb,
  p_ts timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get current user's profile ID
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Insert preference signal
  INSERT INTO public.preference_signals (profile_id, ts, signal)
  VALUES (v_profile_id, p_ts, p_signal)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMIT;