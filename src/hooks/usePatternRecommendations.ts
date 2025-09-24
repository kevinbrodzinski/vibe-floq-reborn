import { useEffect, useState } from 'react';
import { PatternStore, type PatternRecommendation } from '@/core/vibe/storage/PatternStore';

/**
 * Hook for accessing actionable pattern-based recommendations
 * 
 * Provides personalized suggestions like:
 * - "Try coffee shops 9-11am for peak energy"
 * - "Schedule alone time after social events"
 * - "Your creative hours are 3-4pm"
 */

export interface PatternRecommendationsState {
  recommendations: PatternRecommendation[];
  unseenCount: number;
  topRecommendation: PatternRecommendation | null;
  byCategory: {
    temporal: PatternRecommendation[];
    venue: PatternRecommendation[];
    sequence: PatternRecommendation[];
    energy: PatternRecommendation[];
  };
}

export function usePatternRecommendations(): PatternRecommendationsState {
  const [state, setState] = useState<PatternRecommendationsState>({
    recommendations: [],
    unseenCount: 0,
    topRecommendation: null,
    byCategory: {
      temporal: [],
      venue: [],
      sequence: [],
      energy: []
    }
  });

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const recommendations = await PatternStore.getRecommendations();
        
        // Sort by confidence (replacing relevanceScore)
        const sorted = recommendations.sort((a, b) => {
          const scoreA = a.confidence;
          const scoreB = b.confidence;
          return scoreB - scoreA;
        });

        // Count unseen recommendations
        const unseenCount = recommendations.filter(r => !r.lastSeen).length;
        
        // Get top recommendation
        const topRecommendation = sorted.length > 0 ? sorted[0] : null;
        
        // Group by category
        const byCategory = {
          temporal: recommendations.filter(r => r.type === 'temporal'),
          venue: recommendations.filter(r => r.type === 'venue'),
          sequence: recommendations.filter(r => r.type === 'sequence'),
          energy: recommendations.filter(r => r.type === 'energy')
        };

        setState({
          recommendations: sorted,
          unseenCount,
          topRecommendation,
          byCategory
        });

      } catch (error) {
        console.warn('[usePatternRecommendations] Failed to load recommendations:', error);
      }
    };

    loadRecommendations();
    
    // Refresh recommendations periodically
    const interval = setInterval(loadRecommendations, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  return state;
}

/**
 * Hook for managing individual recommendation interactions
 */
export function useRecommendationActions() {
  const markAsSeen = async (recommendationId: string) => {
    try {
      await PatternStore.markRecommendationSeen(recommendationId);
    } catch (error) {
      console.warn('[useRecommendationActions] Failed to mark recommendation as seen:', error);
    }
  };

  const getRecommendationsByContext = async (
    currentHour: number,
    energyLevel: 'low' | 'medium' | 'high',
    socialContext: 'solo' | 'social'
  ): Promise<PatternRecommendation[]> => {
    try {
      const recommendations = await PatternStore.getRecommendations();
      
      // Filter and score recommendations based on current context
      return recommendations
        .map(rec => {
          let contextRelevance = rec.confidence; // Use confidence as base relevance
          
          // Boost temporal recommendations based on current hour
          if (rec.type === 'temporal') {
            if (rec.id.includes('morning') && currentHour >= 6 && currentHour <= 11) {
              contextRelevance += 0.3;
            } else if (rec.id.includes('evening') && currentHour >= 17 && currentHour <= 22) {
              contextRelevance += 0.3;
            }
          }
          
          // Boost energy recommendations based on current energy
          if (rec.type === 'energy') {
            if (rec.id.includes('high-energy') && energyLevel === 'high') {
              contextRelevance += 0.2;
            } else if (rec.id.includes('calm') && energyLevel === 'low') {
              contextRelevance += 0.2;
            }
          }
          
          // Boost social recommendations based on context
          if (rec.type === 'sequence') {
            if (rec.id.includes('social') && socialContext === 'social') {
              contextRelevance += 0.2;
            } else if (rec.id.includes('solo') && socialContext === 'solo') {
              contextRelevance += 0.2;
            }
          }
          
          return {
            ...rec,
            confidence: Math.min(1, contextRelevance) // Update confidence with context boost
          };
        })
        .filter(rec => rec.confidence > 0.5)
        .sort((a, b) => b.confidence - a.confidence);
        
    } catch (error) {
      console.warn('[useRecommendationActions] Failed to get contextual recommendations:', error);
      return [];
    }
  };

  return {
    markAsSeen,
    getRecommendationsByContext
  };
}