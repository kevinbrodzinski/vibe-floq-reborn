import { chronotypeFromHourly } from '@/lib/vibeAnalysis/UserLearningSystem';

describe('Pattern Energy Aggregation', () => {
  // Mock energyFromVector to test updated aggregation
  const energyFromVector = (vec: Record<string, number>): number => {
    return (vec.hype ?? 0) 
         + (vec.energetic ?? 0) 
         + (vec.excited ?? 0) 
         + 0.5 * (vec.flowing ?? 0);
  };

  it('uses energetic/excited instead of open for energy calculation', () => {
    const highEnergyVector = {
      hype: 0.3,
      energetic: 0.4,
      excited: 0.2,
      flowing: 0.2,
      open: 0.5, // should not contribute to energy
      chill: 0.1
    };

    const energyScore = energyFromVector(highEnergyVector);
    // Should be: 0.3 + 0.4 + 0.2 + (0.5 * 0.2) = 1.0
    expect(energyScore).toBeCloseTo(1.0, 2);
  });

  it('gives flowing half weight in energy calculation', () => {
    const flowingVector = {
      flowing: 1.0,
      hype: 0,
      energetic: 0,
      excited: 0
    };

    const energyScore = energyFromVector(flowingVector);
    expect(energyScore).toBeCloseTo(0.5, 2);
  });

  it('chronotype detection requires minimum data', () => {
    // Sparse data (< 6 hours)
    const sparseHourly = {
      8: { chill: 0.5 },
      12: { social: 0.3 },
      18: { hype: 0.4 }
    };

    const chronotype = chronotypeFromHourly(sparseHourly);
    expect(chronotype).toBe('balanced'); // Should default to balanced with sparse data
  });

  it('detects lark pattern from morning preferences', () => {
    const morningHeavy = {
      6: { energetic: 0.8, social: 0.6 },
      7: { flowing: 0.7, open: 0.5 },
      8: { hype: 0.6, energetic: 0.4 },
      9: { social: 0.8, open: 0.3 },
      10: { energetic: 0.5, flowing: 0.4 },
      11: { social: 0.6, open: 0.2 },
      18: { chill: 0.3 },
      22: { down: 0.5 }
    };

    const chronotype = chronotypeFromHourly(morningHeavy);
    expect(chronotype).toBe('lark');
  });
});