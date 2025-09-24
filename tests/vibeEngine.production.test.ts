import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate } from '@/core/vibe/VibeEngine';
import type { EngineInputs } from '@/core/vibe/types';
import { renormalizeVector, adjustVector } from '@/core/vibe/vectorUtils';
import { VIBES } from '@/lib/vibes';

describe('Vibe Engine Production Hardening', () => {
  let baseInputs: EngineInputs;

  beforeEach(() => {
    baseInputs = {
      hour: 14,
      isWeekend: false,
      speedMps: 0,
      screenOnRatio01: 0.3,
      isDaylight: true,
    };
  });

  describe('Vector Renormalization', () => {
    it('should maintain sum = 1 after renormalization', () => {
      const vector: Record<string, number> = {};
      VIBES.forEach(v => vector[v] = Math.random());
      
      renormalizeVector(vector as any);
      
      const sum = VIBES.reduce((acc, v) => acc + vector[v], 0);
      expect(sum).toBeCloseTo(1, 5);
    });

    it('should handle zero vectors safely', () => {
      const vector: Record<string, number> = {};
      VIBES.forEach(v => vector[v] = 0);
      
      renormalizeVector(vector as any);
      
      // Should not crash and maintain valid distribution
      const sum = VIBES.reduce((acc, v) => acc + vector[v], 0);
      expect(sum).toBeCloseTo(0, 5);
    });

    it('should adjust vector values safely', () => {
      const vector: Record<string, number> = {};
      VIBES.forEach(v => vector[v] = 1 / VIBES.length); // Equal distribution
      
      adjustVector(vector as any, 'hype', 0.2);
      
      const sum = VIBES.reduce((acc, v) => acc + vector[v], 0);
      expect(sum).toBeCloseTo(1, 5);
      expect(vector.hype).toBeGreaterThan(1 / VIBES.length);
    });
  });

  describe('Chronotype Detection & Nudges', () => {
    it('should boost circadian for lark users in morning', () => {
      const morningInputs = {
        ...baseInputs,
        hour: 8,
        patterns: {
          hasEnoughData: true,
          chronotype: 'lark' as const,
          energyType: 'balanced' as const,
          socialType: 'balanced' as const,
          consistency: 'consistent' as const,
        }
      };

      // Test with patterns enabled
      const originalEnv = import.meta.env.VITE_VIBE_PATTERNS;
      (import.meta.env as any).VITE_VIBE_PATTERNS = 'on';
      
      const result = evaluate(morningInputs);
      
      // Should have boosted circadian component
      expect(result.components.circadian).toBeGreaterThan(0.6);
      
      (import.meta.env as any).VITE_VIBE_PATTERNS = originalEnv;
    });

    it('should boost circadian for owl users in evening', () => {
      const eveningInputs = {
        ...baseInputs,
        hour: 19,
        patterns: {
          hasEnoughData: true,
          chronotype: 'owl' as const,
          energyType: 'balanced' as const,
          socialType: 'balanced' as const,
          consistency: 'consistent' as const,
        }
      };

      const originalEnv = import.meta.env.VITE_VIBE_PATTERNS;
      (import.meta.env as any).VITE_VIBE_PATTERNS = 'on';
      
      const result = evaluate(eveningInputs);
      
      expect(result.components.circadian).toBeGreaterThan(0.8);
      
      (import.meta.env as any).VITE_VIBE_PATTERNS = originalEnv;
    });

    it('should respect pattern flag when disabled', () => {
      const inputsWithPatterns = {
        ...baseInputs,
        hour: 8,
        patterns: {
          hasEnoughData: true,
          chronotype: 'lark' as const,
          energyType: 'high-energy' as const,
          socialType: 'social' as const,
          consistency: 'consistent' as const,
        }
      };

      // Test with patterns disabled
      const originalEnv = import.meta.env.VITE_VIBE_PATTERNS;
      (import.meta.env as any).VITE_VIBE_PATTERNS = 'off';
      
      const resultWithPatternsOff = evaluate(inputsWithPatterns);
      const resultWithoutPatterns = evaluate(baseInputs);
      
      // Should be identical when patterns are disabled
      expect(resultWithPatternsOff.components.circadian)
        .toEqual(resultWithoutPatterns.components.circadian);
      
      (import.meta.env as any).VITE_VIBE_PATTERNS = originalEnv;
    });
  });

  describe('Pattern Nudge Caps', () => {
    it('should cap component nudges within bounds', () => {
      const inputsWithPatterns = {
        ...baseInputs,
        patterns: {
          hasEnoughData: true,
          chronotype: 'lark' as const,
          energyType: 'high-energy' as const,
          socialType: 'social' as const,
          consistency: 'very-consistent' as const,
        }
      };

      const originalEnv = import.meta.env.VITE_VIBE_PATTERNS;
      (import.meta.env as any).VITE_VIBE_PATTERNS = 'on';
      
      const result = evaluate(inputsWithPatterns);
      
      // All components should stay within [0, 1]
      Object.values(result.components).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
      
      // Confidence should cap at 0.95
      expect(result.confidence01).toBeLessThanOrEqual(0.95);
      
      (import.meta.env as any).VITE_VIBE_PATTERNS = originalEnv;
    });

    it('should maintain vector normalization after pattern nudges', () => {
      const inputsWithPatterns = {
        ...baseInputs,
        patterns: {
          hasEnoughData: true,
          chronotype: 'lark' as const,
          energyType: 'high-energy' as const,
          socialType: 'social' as const,
          consistency: 'consistent' as const,
          temporalPrefs: {
            [baseInputs.hour]: { hype: 0.4, flowing: 0.3 }
          }
        }
      };

      const originalEnv = import.meta.env.VITE_VIBE_PATTERNS;
      (import.meta.env as any).VITE_VIBE_PATTERNS = 'on';
      
      const result = evaluate(inputsWithPatterns);
      
      // Vector should sum to 1 (within floating point precision)
      const sum = VIBES.reduce((acc, vibe) => acc + (result.vector[vibe] ?? 0), 0);
      expect(sum).toBeCloseTo(1, 5);
      
      (import.meta.env as any).VITE_VIBE_PATTERNS = originalEnv;
    });
  });

  describe('Weather Integration', () => {
    it('should apply weather energy offset correctly', () => {
      const inputsWithWeather = {
        ...baseInputs,
        isDaylight: true,
        weatherEnergyOffset: 0.15,
        weatherConfidenceBoost: 0.03,
      };

      const result = evaluate(inputsWithWeather);
      const baseResult = evaluate(baseInputs);
      
      // Weather component should be boosted
      expect(result.components.weather).toBeGreaterThan(baseResult.components.weather);
      
      // Confidence should be slightly boosted
      expect(result.confidence01).toBeGreaterThan(baseResult.confidence01);
    });

    it('should cap weather confidence boost at 0.95', () => {
      const inputsWithHighWeatherBoost = {
        ...baseInputs,
        weatherConfidenceBoost: 0.5, // Artificially high
      };

      const result = evaluate(inputsWithHighWeatherBoost);
      
      expect(result.confidence01).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Venue Intelligence Integration', () => {
    it('should integrate venue intelligence without breaking bounds', () => {
      const inputsWithVenue = {
        ...baseInputs,
        venueArrived: true,
        dwellMinutes: 25,
        venueIntelligence: {
          vibeProfile: {
            primaryVibe: 'social' as const,
            confidence: 0.8,
            energyLevel: 0.7,
            timeOfDayPreferences: {
              morning: 0.3,
              afternoon: 0.8,
              evening: 0.6,
              night: 0.2,
            }
          },
          realTimeMetrics: {
            currentOccupancy: 0.6,
            peakOccupancy: 0.9,
            averageOccupancy: 0.5,
          },
          placeData: {
            isOpen: true,
            rating: 4.5,
            totalRatings: 150,
          }
        }
      };

      const result = evaluate(inputsWithVenue);
      
      // Venue energy should be enhanced but capped
      expect(result.components.venueEnergy).toBeLessThanOrEqual(0.85); // 0.5 + 0.35 max
      
      // Should include venue intelligence in output
      expect(result.venueIntelligence).toBeDefined();
      expect(result.venueIntelligence?.vibeProfile.primaryVibe).toBe('social');
    });
  });

  describe('Performance Constraints', () => {
    it('should complete evaluation within performance bounds', () => {
      const complexInputs = {
        ...baseInputs,
        venueArrived: true,
        dwellMinutes: 30,
        weatherEnergyOffset: 0.1,
        weatherConfidenceBoost: 0.02,
        patterns: {
          hasEnoughData: true,
          chronotype: 'lark' as const,
          energyType: 'high-energy' as const,
          socialType: 'social' as const,
          consistency: 'consistent' as const,
          temporalPrefs: {
            [baseInputs.hour]: { hype: 0.5, social: 0.3 }
          }
        },
        venueIntelligence: {
          vibeProfile: {
            primaryVibe: 'social' as const,
            confidence: 0.9,
            energyLevel: 0.8,
            timeOfDayPreferences: {
              morning: 0.4,
              afternoon: 0.9,
              evening: 0.7,
              night: 0.3,
            }
          },
          realTimeMetrics: {
            currentOccupancy: 0.7,
            peakOccupancy: 1.0,
            averageOccupancy: 0.6,
          },
          placeData: {
            isOpen: true,
            rating: 4.8,
            totalRatings: 500,
          }
        }
      };

      const originalEnv = import.meta.env.VITE_VIBE_PATTERNS;
      (import.meta.env as any).VITE_VIBE_PATTERNS = 'on';
      
      const result = evaluate(complexInputs);
      
      // Should complete within performance bounds (80ms target)
      expect(result.calcMs).toBeLessThan(80);
      
      (import.meta.env as any).VITE_VIBE_PATTERNS = originalEnv;
    });
  });
});