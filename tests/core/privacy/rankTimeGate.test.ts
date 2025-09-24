import { rankTimeGate } from '@/core/privacy/RankTimeGate';

describe('rankTimeGate', () => {
  it('passes when fresh and k-ok', () => {
    const gate = rankTimeGate({ 
      envelopeId: 'balanced', 
      featureTimestamps: [Date.now()], 
      cohortSize: 12, 
      epsilonCost: 0.1 
    });
    expect(gate.ok).toBe(true);
    expect(gate.degrade).toBe('full');
    expect(gate.receiptId).toBeTruthy();
  });

  it('suppresses when ttl expired', () => {
    const gate = rankTimeGate({ 
      envelopeId: 'strict', 
      featureTimestamps: [Date.now() - 10 * 60_000] // 10 minutes ago
    });
    expect(gate.ok).toBe(false);
    expect(gate.degrade).toBe('suppress');
    expect(gate.reason).toBe('ttl_expired');
  });

  it('suppresses when cohort too small', () => {
    const gate = rankTimeGate({ 
      envelopeId: 'balanced', 
      featureTimestamps: [Date.now()], 
      cohortSize: 5 // below minK of 10 for balanced
    });
    expect(gate.ok).toBe(false);
    expect(gate.degrade).toBe('suppress');
    expect(gate.reason).toBe('under_k');
  });

  it('suppresses when epsilon exhausted', () => {
    const gate = rankTimeGate({ 
      envelopeId: 'strict', 
      featureTimestamps: [Date.now()], 
      cohortSize: 25,
      epsilonCost: 1.0 // above budget of 0.5 for strict
    });
    expect(gate.ok).toBe(false);
    expect(gate.degrade).toBe('suppress');
    expect(gate.reason).toBe('epsilon_exhausted');
  });

  it('degrades based on envelope tier', () => {
    const strictGate = rankTimeGate({ 
      envelopeId: 'strict', 
      featureTimestamps: [Date.now()], 
      cohortSize: 25
    });
    expect(strictGate.ok).toBe(true);
    expect(strictGate.degrade).toBe('category');

    const balancedGate = rankTimeGate({ 
      envelopeId: 'balanced', 
      featureTimestamps: [Date.now()], 
      cohortSize: 15
    });
    expect(balancedGate.ok).toBe(true);
    expect(balancedGate.degrade).toBe('full');
  });
});