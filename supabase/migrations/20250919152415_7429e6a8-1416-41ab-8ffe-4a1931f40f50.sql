-- Create group predictability log table
CREATE TABLE public.group_predictability_log (
  group_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL DEFAULT now(),
  omega_g real NOT NULL CHECK (omega_g >= 0 AND omega_g <= 1),
  p_g real NOT NULL CHECK (p_g >= 0 AND p_g <= 1),
  gate_passed boolean NOT NULL,
  fallback text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, ts)
);

-- Create preference signals table
CREATE TABLE public.preference_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL DEFAULT now(),
  signal jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create learned preferences table  
CREATE TABLE public.learned_preferences (
  profile_id uuid NOT NULL,
  preference_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}',
  preference jsonb NOT NULL DEFAULT '{}',
  confidence real NOT NULL DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1),
  support integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, preference_type)
);

-- Enable RLS on all tables
ALTER TABLE public.group_predictability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preference_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_predictability_log
CREATE POLICY "group_predictability_log_read_participants" ON public.group_predictability_log
  FOR SELECT
  USING (
    EXISTS (
      -- Check if user is participant in any floq associated with this group
      SELECT 1 FROM floq_participants fp 
      WHERE fp.floq_id::text = group_predictability_log.group_id::text 
      AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "group_predictability_log_service_write" ON public.group_predictability_log
  FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- RLS policies for preference_signals (owner append-only)
CREATE POLICY "preference_signals_owner_read" ON public.preference_signals
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "preference_signals_owner_insert" ON public.preference_signals
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- RLS policies for learned_preferences
CREATE POLICY "learned_preferences_owner_read" ON public.learned_preferences
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "learned_preferences_owner_write" ON public.learned_preferences
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_group_predictability_log_group_id ON public.group_predictability_log(group_id);
CREATE INDEX idx_group_predictability_log_ts ON public.group_predictability_log(ts DESC);
CREATE INDEX idx_preference_signals_profile_id ON public.preference_signals(profile_id);
CREATE INDEX idx_preference_signals_ts ON public.preference_signals(ts DESC);
CREATE INDEX idx_learned_preferences_profile_id ON public.learned_preferences(profile_id);
CREATE INDEX idx_learned_preferences_type ON public.learned_preferences(preference_type);