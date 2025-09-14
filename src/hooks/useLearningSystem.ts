import { useState, useEffect } from 'react';
import { CorrectionStore } from '@/core/vibe/learning/CorrectionStore';
import { loadPersonalDelta } from '@/core/vibe/learning/PersonalWeightStore';

export function useLearningSystem() {
  const [stats, setStats] = useState({
    corrections: { total: 0, recent: 0, patterns: 0, accuracy: 0 },
    weights: { confidence: 0, correctionCount: 0, lastUpdated: null as number | null }
  });
  const correctionStore = new CorrectionStore();

  const refreshStats = async () => {
    const correctionStats = await correctionStore.getStats();
    const deltas = loadPersonalDelta();
    const deltaCount = Object.values(deltas).reduce((acc, comp) => 
      acc + Object.values(comp || {}).filter(v => Math.abs(v || 0) > 0.01).length, 0
    );
    
    setStats({
      corrections: correctionStats,
      weights: { 
        confidence: Math.min(1, deltaCount / 20), 
        correctionCount: deltaCount,
        lastUpdated: Date.now()
      }
    });
  };

  useEffect(() => {
    refreshStats();
    
    // Update stats periodically
    const interval = setInterval(refreshStats, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const resetLearning = async () => {
    await correctionStore.reset();
    refreshStats();
  };

  const cleanup = async () => {
    await correctionStore.reset();
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