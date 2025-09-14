import { useEffect, useState } from 'react';
import { UserLearningSystem, type PersonalFactors } from '@/lib/vibeAnalysis/UserLearningSystem';
import { chronotypeFromHourly } from '@/lib/vibeAnalysis/UserLearningSystem';

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

  useEffect(() => {
    const updateInsights = async () => {
      try {
        // Get personal factors with mock context (just need corrections)
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

        setInsights({
          chronotype,
          energyType,
          socialType,
          consistency,
          hasEnoughData,
          correctionCount
        });

      } catch (error) {
        console.warn('Failed to calculate personality insights:', error);
        setInsights(null);
      }
    };

    updateInsights();
    
    // Update insights every 30 seconds when user is active
    const interval = setInterval(updateInsights, 30000);
    return () => clearInterval(interval);
  }, [learningSystem]);

  return insights;
}