// Enhanced personality insights with pattern integration
import { useState, useEffect, useCallback } from 'react';
import type { PersonalityInsights } from '@/types/personality';
import { getCachedProfile } from '@/core/patterns/service';
import { usePersonalityInsights as useBasePersonalityInsights } from './usePersonalityInsights';

export function usePatternEnrichedPersonality() {
  const baseInsights = useBasePersonalityInsights();
  const [enrichedInsights, setEnrichedInsights] = useState<PersonalityInsights>(baseInsights);
  const [patternMetadata, setPatternMetadata] = useState<{
    profileUpdated: number;
    sampleCount: number;
    hasPatternData: boolean;
  }>({
    profileUpdated: 0,
    sampleCount: 0,
    hasPatternData: false
  });

  const enrichWithPatterns = useCallback(async (base: PersonalityInsights): Promise<PersonalityInsights> => {
    try {
      const profileStore = await getCachedProfile();
      const profile = profileStore.data;
      
      if (!profile || profile.sampleCount < 5) {
        setPatternMetadata({
          profileUpdated: profile?.updatedAt ?? 0,
          sampleCount: profile?.sampleCount ?? 0,
          hasPatternData: false
        });
        return base;
      }
      
      const enhanced: PersonalityInsights = {
        ...base,
        energyType: determineEnergyType(profile.energyPreference, base.energyType),
        socialType: determineSocialType(profile.socialPreference, base.socialType),
        chronotype: profile.sampleCount > 20 ? profile.chronotype : base.chronotype,
        consistency: determineConsistency(profile.consistency01, base.consistency),
        confidence: Math.min(1, base.confidence + (profile.sampleCount > 10 ? 0.1 : 0)),
        dataQuality: profile.sampleCount > 50 ? 'high' : 
                    profile.sampleCount > 20 ? 'medium' : base.dataQuality,
        lastUpdated: Math.max(base.lastUpdated, profile.updatedAt),
        hasEnoughData: base.hasEnoughData || profile.sampleCount > 10
      };
      
      setPatternMetadata({
        profileUpdated: profile.updatedAt,
        sampleCount: profile.sampleCount,
        hasPatternData: true
      });
      
      return enhanced;
      
    } catch (error) {
      console.warn('Failed to enrich personality with patterns:', error);
      return base;
    }
  }, []);

  useEffect(() => {
    enrichWithPatterns(baseInsights).then(setEnrichedInsights);
  }, [baseInsights, enrichWithPatterns]);

  return {
    insights: enrichedInsights,
    patternMetadata,
    getPatternConfidence: () => patternMetadata.sampleCount > 0 ? 
      Math.min(1, patternMetadata.sampleCount / 50) : 0,
    getPatternExplanation: () => {
      if (!patternMetadata.hasPatternData) return null;
      return `Pattern insights from ${patternMetadata.sampleCount} behavioral samples`;
    }
  };
}

function determineEnergyType(energyPref: number, baseType: PersonalityInsights['energyType']): PersonalityInsights['energyType'] {
  if (energyPref > 0.3) return 'high-energy';
  if (energyPref < -0.3) return 'low-energy';
  return baseType;
}

function determineSocialType(socialPref: number, baseType: PersonalityInsights['socialType']): PersonalityInsights['socialType'] {
  if (socialPref > 0.3) return 'social';
  if (socialPref < -0.3) return 'solo';
  return baseType;
}

function determineConsistency(consistency01: number, baseConsistency: PersonalityInsights['consistency']): PersonalityInsights['consistency'] {
  if (consistency01 > 0.8) return 'very-consistent';
  if (consistency01 > 0.6) return 'consistent';
  if (consistency01 > 0.4) return 'adaptive';
  return 'highly-adaptive';
}