import { useState, useEffect } from 'react';
import { loadPersonalDelta } from '@/core/vibe/learning/PersonalWeightStore';

export function useLearningSystem() {
  const [stats, setStats] = useState({
    corrections: { total: 0, recent: 0, patterns: 0, accuracy: 0 },
    weights: { confidence: 0, correctionCount: 0, lastUpdated: null as number | null }
  });

  const refreshStats = async () => {
    const deltas = loadPersonalDelta();
    const deltaCount = Object.values(deltas).reduce((acc, comp) => 
      acc + Object.values(comp || {}).filter(v => Math.abs(v || 0) > 0.01).length, 0
    );
    
    setStats({
      corrections: { total: deltaCount, recent: deltaCount, patterns: 0, accuracy: 0.8 },
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
    localStorage.removeItem('vibe:personal:delta:v1');
    refreshStats();
  };

  const cleanup = async () => {
    localStorage.removeItem('vibe:personal:delta:v1');
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