import { useEffect, useState, useCallback } from 'react';
import { UserLearningSystem } from '@/core/vibe/learning/UserLearningSystem';
import { PatternStore } from '@/core/vibe/storage/PatternStore';
import { storage } from '@/lib/storage';
import type { PersonalityInsights } from '@/types/personality';

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
        const newInsights = await learningSystem.getPersonalityInsights();
        
        setInsights(newInsights);
        setLastCorrectionsHash(correctionsHash);

        // Cache the computed insights
        await PatternStore.setCachedInsights(newInsights, correctionsHash);

        // Record trend data for analytics
        if (newInsights.hasEnoughData) {
          await PatternStore.recordTrend(
            newInsights.confidence,
            newInsights.confidence,
            0.8, // placeholder accuracy
            newInsights.confidence
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