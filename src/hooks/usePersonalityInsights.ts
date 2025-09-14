import { useEffect, useState, useCallback } from 'react';
import { UserLearningSystem, type PersonalFactors } from '@/lib/vibeAnalysis/UserLearningSystem';
import { chronotypeFromHourly } from '@/lib/vibeAnalysis/UserLearningSystem';
import { PatternStore } from '@/core/vibe/storage/PatternStore';
import { storage } from '@/lib/storage';

export interface PersonalityInsights {
  chronotype: 'lark' | 'owl' | 'balanced';
  energyType: 'high-energy' | 'balanced' | 'low-energy';
  socialType: 'social' | 'balanced' | 'solo';
  consistency: 'very-consistent' | 'consistent' | 'adaptive' | 'highly-adaptive';
  hasEnoughData: boolean;
  correctionCount: number;
}

export function usePersonalityInsights(): PersonalityInsights | null {
  const [insights, setInsights] = useState<PersonalityInsights | null>(null);
  const [learningSystem] = useState(() => new UserLearningSystem());
  const [lastCorrectionsHash, setLastCorrectionsHash] = useState<string | null>(null);

  // Generate hash of corrections for cache invalidation
  const generateCorrectionsHash = useCallback(async (): Promise<string> => {
    try {
      const corrections = await storage.getJSON('vibe-user-learning-v2') || [];
      return JSON.stringify(corrections).slice(0, 100); // Simple hash
    } catch {
      return Date.now().toString();
    }
  }, []);

  useEffect(() => {
    const updateInsights = async () => {
      try {
        // Check for cached insights first
        const correctionsHash = await generateCorrectionsHash();
        
        // If hash hasn't changed, use cached insights
        if (lastCorrectionsHash === correctionsHash) {
          const cached = await PatternStore.getCachedInsights();
          if (cached) {
            setInsights(cached.insights);
            return;
          }
        }

        // Check cache validity with new hash
        const isCacheValid = await PatternStore.isCacheValid(correctionsHash);
        if (isCacheValid) {
          const cached = await PatternStore.getCachedInsights();
          if (cached) {
            setInsights(cached.insights);
            setLastCorrectionsHash(correctionsHash);
            return;
          }
        }

        // Compute fresh insights
        const mockContext = {
          timestamp: new Date(),
          dayOfWeek: new Date().getDay(),
          hourOfDay: new Date().getHours(),
          isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
          timeOfDay: 'afternoon' as const
        };

        const mockSensors = {
          audioLevel: 50,
          lightLevel: 50,
          movement: { intensity: 10, pattern: 'still' as const, frequency: 0 },
          location: { context: 'unknown' as const, density: 0 }
        };

        const personalFactors = await learningSystem.getPersonalFactors(mockSensors, mockContext);
        
        if (!personalFactors.personalityProfile) {
          setInsights(null);
          return;
        }

        const { personalityProfile, temporalPatterns } = personalFactors;
        const correctionCount = personalFactors.contextualPatterns.length;
        const hasEnoughData = correctionCount >= 10;

        // Derive chronotype from temporal patterns
        const chronotype = chronotypeFromHourly(temporalPatterns.hourlyPreferences);

        // Derive energy type from personality profile
        const energyType = personalityProfile.energyPreference > 0.3 
          ? 'high-energy' 
          : personalityProfile.energyPreference < -0.3 
          ? 'low-energy' 
          : 'balanced';

        // Derive social type from personality profile
        const socialType = personalityProfile.socialPreference > 0.3 
          ? 'social' 
          : personalityProfile.socialPreference < -0.3 
          ? 'solo' 
          : 'balanced';

        // Derive consistency type
        let consistency: PersonalityInsights['consistency'];
        if (personalityProfile.consistencyScore > 0.8) {
          consistency = 'very-consistent';
        } else if (personalityProfile.consistencyScore > 0.6) {
          consistency = 'consistent';
        } else if (personalityProfile.adaptabilityScore > 0.7) {
          consistency = 'highly-adaptive';
        } else {
          consistency = 'adaptive';
        }

        const newInsights: PersonalityInsights = {
          chronotype,
          energyType,
          socialType,
          consistency,
          hasEnoughData,
          correctionCount
        };

        setInsights(newInsights);
        setLastCorrectionsHash(correctionsHash);

        // Cache the computed insights
        await PatternStore.setCachedInsights(newInsights, correctionsHash);

        // Record trend data for analytics
        if (hasEnoughData) {
          const confidenceScore = personalFactors.accuracy;
          const chronotypeStability = personalFactors.personalityProfile.consistencyScore;
          await PatternStore.recordTrend(
            correctionCount,
            confidenceScore,
            personalFactors.accuracy,
            chronotypeStability
          );

          // Update recommendations based on new insights
          await PatternStore.updateRecommendations(newInsights);
        }

      } catch (error) {
        console.warn('Failed to calculate personality insights:', error);
        setInsights(null);
      }
    };

    updateInsights();
    
    // Update insights only when corrections change (more efficient)
    // Still check periodically but less frequently 
    const interval = setInterval(updateInsights, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [learningSystem, generateCorrectionsHash]);

  return insights;
}