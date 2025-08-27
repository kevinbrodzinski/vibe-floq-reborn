-- 20250827__init_guardrails.sql
-- Guardrails: epsilon_ledger, consent_ledger, min_interval_table, frequency_caps, group_epsilon_registry
-- Postgres 16 / Supabase; RLS-first; profile_id is canonical user ref.

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------
-- 1) Enum for epsilon_ledger events
-- -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epsilon_event_type') THEN
    CREATE TYPE epsilon_event_type AS ENUM (
      'UPDATE',
      'DELEGATED_INFERENCE',
      'MIGRATION',
      'REVOKE',
      'AUDIT',
      'SIMULATE_FORWARD',
      'REPLAY_EXPLAIN',
      'SNAPSHOT',
      'GROUP_SIMULATE',
      'GROUP_COMMIT',
      'RANK',
      'INTROSPECT',
      'SUBSCRIBE'
    );
  END IF;
END$$;

-- -----------------------------
-- 2) epsilon_ledger
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.epsilon_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL,    -- canonical user ref (owner); FK optional
  event_type       epsilon_event_type NOT NULL,
  epsilon_spent    numeric NOT NULL DEFAULT 0 CHECK (epsilon_spent >= 0),
  k_anon_k         integer,
  min_interval_ok  boolean,
  policy_ref       text,
  device_id        uuid,
  ts               timestamptz NOT NULL DEFAULT now(),
  prev_hash        bytea,
  entry_hash       bytea,
  kid              text,             -- key id used to sign/verify
  jti              text              -- nonce for replay protection
);

COMMENT ON TABLE public.epsilon_ledger IS 'Append-only privacy/usage receipts (owner-scoped via profile_id).';

CREATE INDEX IF NOT EXISTS epsilon_ledger_profile_ts_idx ON public.epsilon_ledger (profile_id, ts DESC);
CREATE INDEX IF NOT EXISTS epsilon_ledger_jti_idx ON public.epsilon_ledger (jti);
CREATE INDEX IF NOT EXISTS epsilon_ledger_kid_idx ON public.epsilon_ledger (kid);

ALTER TABLE public.epsilon_ledger ENABLE ROW LEVEL SECURITY;

-- Owner-only policies
DROP POLICY IF EXISTS el_owner_select ON public.epsilon_ledger;
CREATE POLICY el_owner_select
  ON public.epsilon_ledger
  FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS el_owner_insert ON public.epsilon_ledger;
CREATE POLICY el_owner_insert
  ON public.epsilon_ledger
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS el_owner_update ON public.epsilon_ledger;
CREATE POLICY el_owner_update
  ON public.epsilon_ledger
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS el_owner_delete ON public.epsilon_ledger;
CREATE POLICY el_owner_delete
  ON public.epsilon_ledger
  FOR DELETE
  USING (profile_id = auth.uid());

-- -----------------------------
-- 3) consent_ledger
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.consent_ledger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL,
  aud         text NOT NULL,           -- relying party / client_id
  scope       text NOT NULL,           -- e.g., 'music', 'work', 'social', 'home', 'commerce'
  purpose     text,                    -- declared purpose
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);

COMMENT ON TABLE public.consent_ledger IS 'Per-party consent records (owner-scoped).';

-- Unique active consent per (profile_id, aud, scope, purpose)
DROP INDEX IF EXISTS consent_unique_active;
CREATE UNIQUE INDEX consent_unique_active
  ON public.consent_ledger (profile_id, aud, scope, COALESCE(purpose, ''))
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS consent_ledger_profile_aud_idx ON public.consent_ledger (profile_id, aud);

ALTER TABLE public.consent_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cl_owner_select ON public.consent_ledger;
CREATE POLICY cl_owner_select
  ON public.consent_ledger
  FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS cl_owner_insert ON public.consent_ledger;
CREATE POLICY cl_owner_insert
  ON public.consent_ledger
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS cl_owner_update ON public.consent_ledger;
CREATE POLICY cl_owner_update
  ON public.consent_ledger
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS cl_owner_delete ON public.consent_ledger;
CREATE POLICY cl_owner_delete
  ON public.consent_ledger
  FOR DELETE
  USING (profile_id = auth.uid());

-- -----------------------------
-- 4) min_interval_table
--     Global rows: profile_id IS NULL (readable by all authed); per-user overrides: profile_id = owner.
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.min_interval_table (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid,               -- NULL => global default; otherwise per-user override
  class_key    text NOT NULL,      -- e.g., 'presence', 'music.switch', 'work.status', etc.
  interval_ms  integer NOT NULL CHECK (interval_ms >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.min_interval_table IS 'Min-interval config; global (NULL profile_id) and per-user overrides.';

-- Keep one global per class_key and one per-user override per class_key
DROP INDEX IF EXISTS mit_unique_global;
CREATE UNIQUE INDEX mit_unique_global
  ON public.min_interval_table (class_key)
  WHERE profile_id IS NULL;

DROP INDEX IF EXISTS mit_unique_per_user;
CREATE UNIQUE INDEX mit_unique_per_user
  ON public.min_interval_table (profile_id, class_key)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mit_profile_class_idx ON public.min_interval_table (profile_id, class_key);

ALTER TABLE public.min_interval_table ENABLE ROW LEVEL SECURITY;

-- Read: global OR owner
DROP POLICY IF EXISTS mit_read_global_or_owner ON public.min_interval_table;
CREATE POLICY mit_read_global_or_owner
  ON public.min_interval_table
  FOR SELECT
  USING (profile_id IS NULL OR profile_id = auth.uid());

-- Insert/update/delete: owner only for their rows (cannot modify global rows)
DROP POLICY IF EXISTS mit_owner_insert ON public.min_interval_table;
CREATE POLICY mit_owner_insert
  ON public.min_interval_table
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS mit_owner_update ON public.min_interval_table;
CREATE POLICY mit_owner_update
  ON public.min_interval_table
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS mit_owner_delete ON public.min_interval_table;
CREATE POLICY mit_owner_delete
  ON public.min_interval_table
  FOR DELETE
  USING (profile_id = auth.uid());

-- -----------------------------
-- 5) frequency_caps
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.frequency_caps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL,        -- owner
  partner_id    text NOT NULL,        -- relying party identifier
  cap_per_day   integer NOT NULL CHECK (cap_per_day >= 0),
  used_today    integer NOT NULL DEFAULT 0 CHECK (used_today >= 0),
  reset_on      date NOT NULL,        -- daily window (UTC)
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.frequency_caps IS 'Per-partner delivery caps and usage for pacing.';

DROP INDEX IF EXISTS freq_caps_unique_day;
CREATE UNIQUE INDEX freq_caps_unique_day
  ON public.frequency_caps (profile_id, partner_id, reset_on);

CREATE INDEX IF NOT EXISTS freq_caps_profile_partner_idx ON public.frequency_caps (profile_id, partner_id);

ALTER TABLE public.frequency_caps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fc_owner_select ON public.frequency_caps;
CREATE POLICY fc_owner_select
  ON public.frequency_caps
  FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS fc_owner_insert ON public.frequency_caps;
CREATE POLICY fc_owner_insert
  ON public.frequency_caps
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS fc_owner_update ON public.frequency_caps;
CREATE POLICY fc_owner_update
  ON public.frequency_caps
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS fc_owner_delete ON public.frequency_caps;
CREATE POLICY fc_owner_delete
  ON public.frequency_caps
  FOR DELETE
  USING (profile_id = auth.uid());

-- -----------------------------
-- 6) group_epsilon_registry
--     MVP: rows owned by creator; later, tighten to "group members" when a membership table is finalized.
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.group_epsilon_registry (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id           uuid NOT NULL,
  epsilon_remaining  numeric NOT NULL CHECK (epsilon_remaining >= 0),
  window_start       timestamptz NOT NULL,
  window_end         timestamptz NOT NULL,
  created_by         uuid NOT NULL,            -- owner for RLS
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.group_epsilon_registry IS 'Group-level ε budgets by window; RLS owner=creator (tighten to members later).';

DROP INDEX IF EXISTS ger_unique_window;
CREATE UNIQUE INDEX ger_unique_window
  ON public.group_epsilon_registry (group_id, window_start, window_end);

CREATE INDEX IF NOT EXISTS ger_created_by_idx ON public.group_epsilon_registry (created_by);

ALTER TABLE public.group_epsilon_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ger_owner_select ON public.group_epsilon_registry;
CREATE POLICY ger_owner_select
  ON public.group_epsilon_registry
  FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS ger_owner_insert ON public.group_epsilon_registry;
CREATE POLICY ger_owner_insert
  ON public.group_epsilon_registry
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS ger_owner_update ON public.group_epsilon_registry;
CREATE POLICY ger_owner_update
  ON public.group_epsilon_registry
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS ger_owner_delete ON public.group_epsilon_registry;
CREATE POLICY ger_owner_delete
  ON public.group_epsilon_registry
  FOR DELETE
  USING (created_by = auth.uid());