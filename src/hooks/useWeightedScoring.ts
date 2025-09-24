import { useState, useCallback, useEffect } from 'react';

export interface ScoringWeights {
  distance: number;
  rating: number;
  activity: number;
  personalization: number;
  recency: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.3,
  rating: 0.25,
  activity: 0.2,
  personalization: 0.15,
  recency: 0.1
};

export const useWeightedScoring = () => {
  const [weights, setWeights] = useState<ScoringWeights>(() => {
    try {
      const stored = localStorage.getItem('scoring-weights');
      return stored ? JSON.parse(stored) : DEFAULT_WEIGHTS;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  });

  // Debounced localStorage write to prevent race conditions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('scoring-weights', JSON.stringify(weights));
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [weights]);

  const updateWeight = useCallback((key: keyof ScoringWeights, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(1, value)) // Clamp between 0 and 1
    }));
  }, []);

  const resetWeights = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS);
  }, []);

  const normalizeWeights = useCallback(() => {
    const total = Object.values(weights).reduce((sum: number, weight: number) => sum + weight, 0);
    if (total === 0) return weights;
    
    const normalized = Object.entries(weights).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: (value as number) / total
    }), {} as ScoringWeights);
    
    setWeights(normalized);
    return normalized;
  }, [weights]);

  const calculateScore = useCallback((
    recommendation: {
      distance: number;
      rating?: number;
      participants?: number;
      live_count?: number;
      score?: number; // personalized score from backend
    },
    maxDistance: number = 5000
  ): number => {
    const normalizedDistance = Math.min(recommendation.distance / maxDistance, 1);
    const distanceScore = (1 - normalizedDistance) * weights.distance;
    
    const ratingScore = (recommendation.rating || 0) / 5 * weights.rating;
    
    const activityLevel = Math.min(
      (recommendation.participants || recommendation.live_count || 0) / 20, 
      1
    );
    const activityScore = activityLevel * weights.activity;
    
    const personalizationScore = (recommendation.score || 0.5) * weights.personalization;
    
    // Recency factor - for now, just use a baseline
    const recencyScore = 0.5 * weights.recency;
    
    return distanceScore + ratingScore + activityScore + personalizationScore + recencyScore;
  }, [weights]);

  // Improved isDefault check that's order-independent
  const isDefault = Object.entries(DEFAULT_WEIGHTS).every(([key, value]) => 
    Math.abs(weights[key as keyof ScoringWeights] - value) < 0.01
  );

  return {
    weights,
    updateWeight,
    resetWeights,
    normalizeWeights,
    calculateScore,
    isDefault
  };
};