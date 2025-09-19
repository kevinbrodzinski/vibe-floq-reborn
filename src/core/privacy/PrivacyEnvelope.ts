export type EnvelopeId = 'strict' | 'balanced' | 'permissive';

export type PrivacyEnvelope = {
  id: EnvelopeId;
  ttlMs: number;          // freshness window for features used
  minK: number;           // cohort size minimum for any aggregate use
  epsilonBudget?: number; // declared ε budget for this session branch
  explanationTier: 'full' | 'category' | 'binary';
};

export const ENVELOPES: Record<EnvelopeId, PrivacyEnvelope> = {
  strict: {
    id: 'strict',
    ttlMs: 5 * 60_000,
    minK: 20,
    epsilonBudget: 0.5,
    explanationTier: 'category'
  },
  balanced: {
    id: 'balanced',
    ttlMs: 10 * 60_000,
    minK: 10,
    epsilonBudget: 1.0,
    explanationTier: 'full'
  },
  permissive: {
    id: 'permissive',
    ttlMs: 15 * 60_000,
    minK: 5,
    epsilonBudget: 2.0,
    explanationTier: 'full'
  },
};