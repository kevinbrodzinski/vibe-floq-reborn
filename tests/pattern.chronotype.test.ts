import { describe, it, expect } from 'vitest';
import { analyzeUserPatterns } from '@/lib/vibeAnalysis/UserLearningSystem';
import type { CorrectionHistory } from '@/core/vibe/types';
import { VIBES } from '@/lib/vibes';

describe('Chronotype Detection', () => {
  const createMockCorrection = (
    hour: number, 
    vibe: string, 
    isWeekend = false
  ): CorrectionHistory => ({
    timestamp: Date.now(),
    predicted: Object.fromEntries(VIBES.map(v => [v, 0.1])) as any,
    corrected: vibe as any,
    components: {
      circadian: 0.5,
      movement: 0.3,
      venueEnergy: 0.4,
      deviceUsage: 0.3,
      weather: 0.2,
    },
    context: {
      temporal: { hour, isWeekend },
      venue: null,
      movement: null,
    }
  });

  describe('Lark Detection', () => {
    it('should detect lark chronotype from morning-heavy corrections', () => {
      const corrections: CorrectionHistory[] = [
        // Strong morning activity (6-11am)
        ...Array.from({ length: 8 }, (_, i) => 
          createMockCorrection(7 + (i % 3), 'energetic', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(8 + (i % 2), 'flowing', true)
        ),
        // Some afternoon activity but less
        ...Array.from({ length: 3 }, (_, i) => 
          createMockCorrection(14 + i, 'social', false)
        ),
        // Minimal evening activity
        createMockCorrection(19, 'chill', false),
        createMockCorrection(20, 'down', false),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.chronotype).toBe('lark');
      expect(analysis.hasEnoughData).toBe(true);
    });

    it('should require significant morning bias for lark classification', () => {
      const corrections: CorrectionHistory[] = [
        // Equal distribution across all hours
        ...Array.from({ length: 4 }, (_, i) => 
          createMockCorrection(8 + i, 'energetic', false)
        ),
        ...Array.from({ length: 4 }, (_, i) => 
          createMockCorrection(14 + i, 'social', false)
        ),
        ...Array.from({ length: 4 }, (_, i) => 
          createMockCorrection(19 + i, 'chill', false)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.chronotype).toBe('balanced');
    });
  });

  describe('Owl Detection', () => {
    it('should detect owl chronotype from evening-heavy corrections', () => {
      const corrections: CorrectionHistory[] = [
        // Minimal morning activity
        createMockCorrection(8, 'down', false),
        createMockCorrection(9, 'chill', false),
        // Some afternoon activity
        ...Array.from({ length: 3 }, (_, i) => 
          createMockCorrection(15 + i, 'social', false)
        ),
        // Strong evening activity (17-22)
        ...Array.from({ length: 10 }, (_, i) => 
          createMockCorrection(18 + (i % 4), 'hype', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(19 + (i % 3), 'energetic', true)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.chronotype).toBe('owl');
      expect(analysis.hasEnoughData).toBe(true);
    });
  });

  describe('Balanced Detection', () => {
    it('should detect balanced chronotype for even distribution', () => {
      const corrections: CorrectionHistory[] = [
        // Even distribution across time periods
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(8 + (i % 3), 'energetic', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(14 + (i % 3), 'social', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(19 + (i % 3), 'flowing', false)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.chronotype).toBe('balanced');
      expect(analysis.hasEnoughData).toBe(true);
    });
  });

  describe('Data Quality Guards', () => {
    it('should require minimum corrections for reliable chronotype', () => {
      const corrections: CorrectionHistory[] = [
        createMockCorrection(8, 'energetic', false),
        createMockCorrection(9, 'flowing', false),
        createMockCorrection(19, 'hype', false),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.hasEnoughData).toBe(false);
      expect(analysis.chronotype).toBe('balanced'); // Default fallback
    });

    it('should require non-empty hours for chronotype detection', () => {
      // Only corrections in 5 hours (below 6-hour threshold)
      const corrections: CorrectionHistory[] = [
        ...Array.from({ length: 5 }, () => createMockCorrection(8, 'energetic', false)),
        ...Array.from({ length: 5 }, () => createMockCorrection(14, 'social', false)),
        ...Array.from({ length: 5 }, () => createMockCorrection(19, 'hype', false)),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      // Should fall back to balanced due to insufficient hour coverage
      expect(analysis.chronotype).toBe('balanced');
    });
  });

  describe('Energy Type Detection', () => {
    it('should detect high-energy type from energetic vibes', () => {
      const corrections: CorrectionHistory[] = [
        ...Array.from({ length: 8 }, (_, i) => 
          createMockCorrection(10 + (i % 8), 'hype', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(15 + (i % 4), 'energetic', false)
        ),
        ...Array.from({ length: 4 }, (_, i) => 
          createMockCorrection(19 + (i % 3), 'excited', false)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.energyType).toBe('high-energy');
    });

    it('should detect low-energy type from chill vibes', () => {
      const corrections: CorrectionHistory[] = [
        ...Array.from({ length: 8 }, (_, i) => 
          createMockCorrection(10 + (i % 8), 'chill', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(15 + (i % 4), 'down', false)
        ),
        ...Array.from({ length: 4 }, (_, i) => 
          createMockCorrection(19 + (i % 3), 'solo', false)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.energyType).toBe('low-energy');
    });
  });

  describe('Social Type Detection', () => {
    it('should detect social type from social/open vibes', () => {
      const corrections: CorrectionHistory[] = [
        ...Array.from({ length: 10 }, (_, i) => 
          createMockCorrection(10 + (i % 8), 'social', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(15 + (i % 4), 'open', false)
        ),
        ...Array.from({ length: 2 }, (_, i) => 
          createMockCorrection(19 + i, 'romantic', false)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.socialType).toBe('social');
    });

    it('should detect solo type from solo/weird vibes', () => {
      const corrections: CorrectionHistory[] = [
        ...Array.from({ length: 10 }, (_, i) => 
          createMockCorrection(10 + (i % 8), 'solo', false)
        ),
        ...Array.from({ length: 6 }, (_, i) => 
          createMockCorrection(15 + (i % 4), 'weird', false)
        ),
        ...Array.from({ length: 2 }, (_, i) => 
          createMockCorrection(19 + i, 'curious', false)
        ),
      ];

      const analysis = analyzeUserPatterns(corrections);
      
      expect(analysis.socialType).toBe('solo');
    });
  });
});