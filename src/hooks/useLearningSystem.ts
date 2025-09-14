import { useState, useEffect } from 'react';
import { CorrectionStore } from '@/core/vibe/storage/CorrectionStore';
import { PersonalWeights } from '@/core/vibe/learning/PersonalWeights';

export function useLearningSystem() {
  const [stats, setStats] = useState({
    corrections: { total: 0, recent: 0, patterns: 0, accuracy: 0 },
    weights: { confidence: 0, correctionCount: 0, lastUpdated: null as number | null }
  });

  const refreshStats = () => {
    setStats({
      corrections: CorrectionStore.getStats(),
      weights: PersonalWeights.getStats()
    });
  };

  useEffect(() => {
    refreshStats();
    
    // Update stats periodically
    const interval = setInterval(refreshStats, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const resetLearning = () => {
    PersonalWeights.reset();
    refreshStats();
  };

  const cleanup = () => {
    CorrectionStore.cleanup();
    refreshStats();
  };

  return {
    stats,
    refreshStats,
    resetLearning,
    cleanup,
    isLearning: stats.weights.confidence > 0.3,
    isPersonalized: stats.weights.confidence > 0.6
  };
}