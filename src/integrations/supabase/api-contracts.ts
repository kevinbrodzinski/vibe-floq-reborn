// Hand-authored public API contracts used by edge functions and UI.
// Do not edit ./types.ts (generated). Import Database types from there if needed.

// ---- Policy ----
export type PolicyDecision = {
  allowed: boolean;
  reason?:
    | 'venue_safety'
    | 'low_confidence'
    | 'high_uncertainty'
    | 'min_interval'
    | 'hysteresis'
    | 'ok';
  redactionLevel?: 'label_only' | 'banded' | 'raw';
  observability: {
    min_interval_enforced: boolean;
    hysteresis_applied: boolean;
  };
};

// ---- Identity / Introspection ----
export type VibeToken = {
  sub_ppid: string; // pairwise per relying party
  aud: string;
  scope: 'music' | 'work' | 'social' | 'home' | 'commerce';
  claim: { kind: 'label' | 'band' | 'raw'; value: string | number; confidence?: number };
  exp: number;
  iat: number;
  jti: string;
  kid: string;
};

export type IntrospectionResponse = {
  claim: { kind: 'label' | 'band' | 'raw'; value: string | number; confidence?: number };
  budget_remaining: number;
  min_interval_enforced: boolean;
  hysteresis_applied: boolean;
  kid: string;
  jti: string;
  // client must echo this for any further disclosures
  idempotency_key: string;
};

export type SubscriptionEvent = {
  change: 'threshold_crossing';
  claim: { kind: 'label' | 'band'; value: string | number };
  hysteresis_applied: boolean;
  min_interval_enforced: boolean;
  kid: string;
  jti: string;
  idempotency_key: string;
};

// ---- Ranking ----
export type RankedItem<TMeta = unknown> = { id: string; score: number; meta?: TMeta };
export type FrequencyCapState = 'ok' | 'limited' | 'exhausted';

export type RankResponse<TMeta = unknown> = {
  items: Array<RankedItem<TMeta>>;
  topK_hash: string;
  budget_remaining: number;
  frequency_cap_state: FrequencyCapState;
};

// ---- Groups (GST & predictability) ----
export type GST = {
  group_id: string;
  member_passport_ids: string[];
  ttl_ms: number;
  policy_version: string;
};

export type GroupPredictability = {
  ok: boolean;
  omega_G: number; // [0,1] quantile-spread proxy
  P_G: number;     // [0,1] info-gain proxy
  fallback?: 'RELAX' | 'PARTITION' | 'INDIVIDUAL';
  explanation?: string;
};

// ---- (Optional) zod schemas (only if you're already using zod) ----
// import { z } from 'zod';
// export const PolicyDecisionSchema = z.object({ ... });