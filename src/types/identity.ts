import { z } from 'zod';
import { ClaimKindSchema } from './policy';

// PPID (Pairwise Pseudonymous ID) Token
export const VibeTokenSchema = z.object({
  sub_ppid: z.string(), // pairwise per relying party
  aud: z.string(),
  scope: z.enum(['music', 'work', 'social', 'home', 'commerce']),
  claim: z.object({
    kind: ClaimKindSchema,
    value: z.union([z.string(), z.number()]),
    confidence: z.number().min(0).max(1).optional(),
  }),
  exp: z.number(),
  iat: z.number(),
  jti: z.string(),
  kid: z.string(),
});

export type VibeToken = z.infer<typeof VibeTokenSchema>;

// Introspection API response
export const IntrospectionResponseSchema = z.object({
  claim: z.object({
    kind: ClaimKindSchema,
    value: z.union([z.string(), z.number()]),
    confidence: z.number().min(0).max(1).optional(),
  }),
  budget_remaining: z.number().min(0),
  min_interval_enforced: z.boolean(),
  hysteresis_applied: z.boolean(),
  kid: z.string(),
  jti: z.string(),
  idempotency_key: z.string(), // client must echo this for further disclosures
});

export type IntrospectionResponse = z.infer<typeof IntrospectionResponseSchema>;

// Subscription event for real-time updates
export const SubscriptionEventSchema = z.object({
  change: z.literal('threshold_crossing'),
  claim: z.object({
    kind: z.enum(['label', 'band']), // never raw for subscriptions
    value: z.union([z.string(), z.number()]),
  }),
  hysteresis_applied: z.boolean(),
  min_interval_enforced: z.boolean(),
  kid: z.string(),
  jti: z.string(),
  idempotency_key: z.string(),
});

export type SubscriptionEvent = z.infer<typeof SubscriptionEventSchema>;

// Epsilon receipt for audit trail
export const EpsilonReceiptSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  event_type: z.enum(['introspect', 'subscribe', 'rank', 'group']),
  epsilon_spent: z.number(),
  k_anon_k: z.number().int().min(1),
  min_interval_ok: z.boolean(),
  policy_ref: z.string(),
  device_id: z.string().optional(),
  timestamp: z.date(),
  prev_hash: z.string().optional(),
  entry_hash: z.string(),
  kid: z.string(),
  jti: z.string(),
});

export type EpsilonReceipt = z.infer<typeof EpsilonReceiptSchema>;

// Model passport for identity-bound personalization
export const ModelPassportSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  model_version: z.string(),
  capabilities: z.array(z.string()),
  privacy_budget: z.number(),
  budget_remaining: z.number(),
  created_at: z.date(),
  expires_at: z.date(),
  enclave_attestation: z.string().optional(), // for TEE verification
});

export type ModelPassport = z.infer<typeof ModelPassportSchema>;