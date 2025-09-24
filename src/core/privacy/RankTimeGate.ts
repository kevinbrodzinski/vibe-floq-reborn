import { ENVELOPES, type PrivacyEnvelope } from './PrivacyEnvelope';

export type GateInput = {
  envelopeId: keyof typeof ENVELOPES;
  featureTimestamps: number[];   // ms timestamps of all features we will use
  cohortSize?: number;           // if aggregates are used
  epsilonCost?: number;          // declared ε spend for this attempt
};

export type GateDecision =
  | { ok: true; degrade: 'full' | 'category' | 'binary'; receiptId: string }
  | { ok: false; degrade: 'suppress'; receiptId: string; reason: string };

const uuid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function rankTimeGate(inp: GateInput): GateDecision {
  const env: PrivacyEnvelope = ENVELOPES[inp.envelopeId];
  const now = Date.now();
  const ttlExpired = inp.featureTimestamps.some(ts => now - ts > env.ttlMs);
  const kOk = (inp.cohortSize ?? env.minK) >= env.minK;
  const epsOk = (inp.epsilonCost ?? 0) <= (env.epsilonBudget ?? Infinity);
  const receiptId = uuid();

  if (!ttlExpired && kOk && epsOk) {
    const degrade: 'full' | 'category' | 'binary' =
      env.explanationTier === 'category' ? 'category'
      : env.explanationTier === 'binary' ? 'binary'
      : 'full';
    return { ok: true, degrade, receiptId };
  }

  const reason = ttlExpired ? 'ttl_expired' : (!kOk ? 'under_k' : 'epsilon_exhausted');
  return { ok: false, degrade: 'suppress', receiptId, reason };
}