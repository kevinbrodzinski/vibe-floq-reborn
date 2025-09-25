import { predictabilityGate, omegaSpread, infoGainEntropy } from '@/core/group/predictability';

describe('omegaSpread', () => {
  it('returns 0 for uniform distribution', () => {
    const spread = omegaSpread([0.33, 0.33, 0.34]);
    expect(spread).toBeCloseTo(0, 2);
  });

  it('returns high spread for polarized distribution', () => {
    const spread = omegaSpread([0.1, 0.9]);
    expect(spread).toBeCloseTo(0.8, 1);
  });

  it('handles empty array', () => {
    const spread = omegaSpread([]);
    expect(spread).toBe(1);
  });
});

describe('infoGainEntropy', () => {
  it('calculates entropy difference', () => {
    const before = [0.5, 0.5];
    const after = [0.9, 0.1];
    const gain = infoGainEntropy(before, after);
    expect(gain).toBeGreaterThan(0);
  });

  it('returns 0 when no information gained', () => {
    const uniform = [0.5, 0.5];
    const gain = infoGainEntropy(uniform, uniform);
    expect(gain).toBeCloseTo(0, 3);
  });
});

describe('predictabilityGate', () => {
  it('passes when spread low and gain high', () => {
    const groupPreds = [
      [0.7, 0.2, 0.1],
      [0.65, 0.25, 0.1],
      [0.68, 0.22, 0.1]
    ];
    const result = predictabilityGate(groupPreds, 0.4, 0.01);
    expect(result.ok).toBe(true);
    expect(result.fallback).toBeNull();
  });

  it('suggests partition when spread too high', () => {
    const groupPreds = [
      [0.9, 0.1, 0.0],
      [0.1, 0.9, 0.0],
      [0.0, 0.1, 0.9]
    ];
    const result = predictabilityGate(groupPreds, 0.2, 0.01);
    expect(result.ok).toBe(false);
    expect(result.fallback).toBe('partition');
  });

  it('suggests relax_constraints when gain too low', () => {
    const groupPreds = [
      [0.5, 0.3, 0.2],
      [0.5, 0.3, 0.2],
      [0.5, 0.3, 0.2]
    ];
    const result = predictabilityGate(groupPreds, 0.4, 0.5);
    expect(result.ok).toBe(false);
    expect(result.fallback).toBe('relax_constraints');
  });

  it('handles empty input', () => {
    const result = predictabilityGate([]);
    expect(result.ok).toBe(false);
    expect(result.fallback).toBe('relax_constraints');
  });

  it('handles malformed input', () => {
    const result = predictabilityGate([[]]);
    expect(result.ok).toBe(false);
    expect(result.fallback).toBe('relax_constraints');
  });
});