-- Patent guardrails: Core tables for policy ladder, identity, and observability
-- Phase 1: Minimal schema with RLS-first approach

-- Epsilon ledger for audit trail and privacy budget tracking
CREATE TABLE public.epsilon_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('introspect', 'subscribe', 'rank', 'group')),
  epsilon_spent NUMERIC(10,6) NOT NULL DEFAULT 0.0,
  k_anon_k INTEGER NOT NULL DEFAULT 1,
  min_interval_ok BOOLEAN NOT NULL DEFAULT true,
  policy_ref TEXT NOT NULL DEFAULT 'v1.0',
  device_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  prev_hash BYTEA,
  entry_hash BYTEA NOT NULL,
  kid TEXT NOT NULL,
  jti TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consent ledger for tracking partner permissions
CREATE TABLE public.consent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  aud TEXT NOT NULL, -- relying party identifier
  scope TEXT NOT NULL CHECK (scope IN ('music', 'work', 'social', 'home', 'commerce')),
  purpose TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Min interval enforcement table
CREATE TABLE public.min_interval_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class TEXT NOT NULL CHECK (class IN ('presence', 'checkin', 'planning', 'ranking', 'group')),
  interval_ms INTEGER NOT NULL,
  profile_id UUID, -- NULL = global default, UUID = user-specific override
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Frequency caps for pacing
CREATE TABLE public.frequency_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  partner_id TEXT NOT NULL, -- relying party identifier
  cap_per_day INTEGER NOT NULL DEFAULT 100,
  used_today INTEGER NOT NULL DEFAULT 0,
  reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, partner_id, reset_at)
);

-- Group epsilon registry for group privacy budgets
CREATE TABLE public.group_epsilon_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  epsilon_remaining NUMERIC(10,6) NOT NULL DEFAULT 1.0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Model passports for identity-bound personalization (stub)
CREATE TABLE public.model_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  privacy_budget NUMERIC(10,6) NOT NULL DEFAULT 1.0,
  budget_remaining NUMERIC(10,6) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  enclave_attestation TEXT, -- for TEE verification
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_epsilon_ledger_profile_timestamp ON public.epsilon_ledger(profile_id, timestamp DESC);
CREATE INDEX idx_consent_ledger_profile_aud ON public.consent_ledger(profile_id, aud);
CREATE INDEX idx_frequency_caps_profile_partner ON public.frequency_caps(profile_id, partner_id, reset_at);
CREATE INDEX idx_group_epsilon_registry_group_window ON public.group_epsilon_registry(group_id, window_start, window_end);
CREATE INDEX idx_model_passports_profile ON public.model_passports(profile_id, expires_at);

-- RLS Policies (deny by default, profile_id scoped)

-- Epsilon ledger: owner-only access
ALTER TABLE public.epsilon_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epsilon_ledger_owner_access" ON public.epsilon_ledger
  FOR ALL USING (profile_id = auth.uid());

-- Consent ledger: owner-only access  
ALTER TABLE public.consent_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_ledger_owner_access" ON public.consent_ledger
  FOR ALL USING (profile_id = auth.uid());

-- Min interval table: read public, write owner/admin
ALTER TABLE public.min_interval_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "min_interval_table_read_all" ON public.min_interval_table
  FOR SELECT USING (true);
CREATE POLICY "min_interval_table_write_owner" ON public.min_interval_table
  FOR INSERT WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);
CREATE POLICY "min_interval_table_update_owner" ON public.min_interval_table
  FOR UPDATE USING (profile_id = auth.uid() OR profile_id IS NULL);

-- Frequency caps: owner + partner scoped
ALTER TABLE public.frequency_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frequency_caps_owner_access" ON public.frequency_caps
  FOR ALL USING (profile_id = auth.uid());

-- Group epsilon registry: group members only (simplified for now)
ALTER TABLE public.group_epsilon_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_epsilon_registry_public_read" ON public.group_epsilon_registry
  FOR SELECT USING (true); -- TODO: restrict to group members

-- Model passports: owner-only access
ALTER TABLE public.model_passports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_passports_owner_access" ON public.model_passports
  FOR ALL USING (profile_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_min_interval_table
  BEFORE UPDATE ON public.min_interval_table
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_frequency_caps
  BEFORE UPDATE ON public.frequency_caps
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_group_epsilon_registry
  BEFORE UPDATE ON public.group_epsilon_registry
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_model_passports
  BEFORE UPDATE ON public.model_passports
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();