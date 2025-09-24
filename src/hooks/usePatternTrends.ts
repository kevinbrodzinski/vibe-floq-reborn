import { useEffect, useState } from 'react';
import { PatternStore, type PatternTrend } from '@/core/vibe/storage/PatternStore';

/**
 * Hook for tracking pattern confidence and accuracy over time
 * 
 * Provides insights into:
 * - How pattern learning is improving
 * - Confidence trends over time  
 * - Learning velocity and stability
 */

export interface PatternTrendAnalysis {
  trends: PatternTrend[];
  confidenceTrend: 'improving' | 'stable' | 'declining' | 'insufficient-data';
  accuracyTrend: 'improving' | 'stable' | 'declining' | 'insufficient-data';
  learningVelocity: number; // How fast patterns are improving (0-1)
  stabilityScore: number;   // How stable patterns are (0-1)
  daysOfData: number;       // How many days of pattern data we have
  recentConfidence: number; // Most recent confidence score
  recentAccuracy: number;   // Most recent accuracy score
}

export function usePatternTrends(): PatternTrendAnalysis | null {
  const [analysis, setAnalysis] = useState<PatternTrendAnalysis | null>(null);

  useEffect(() => {
    const analyzeTrends = async () => {
      try {
        const trends = await PatternStore.getTrends();
        
        if (trends.length < 2) {
          setAnalysis({
            trends: [],
            confidenceTrend: 'insufficient-data',
            accuracyTrend: 'insufficient-data',
            learningVelocity: 0,
            stabilityScore: 0,
            daysOfData: 0,
            recentConfidence: 0,
            recentAccuracy: 0
          });
          return;
        }

        // Sort trends by timestamp
        const sortedTrends = trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Calculate trends over time
        const confidenceTrend = calculateTrend(sortedTrends.map(t => t.confidenceScore));
        const accuracyTrend = calculateTrend(sortedTrends.map(t => t.accuracy));
        
        // Calculate learning velocity (rate of improvement)
        const learningVelocity = calculateLearningVelocity(sortedTrends);
        
        // Calculate stability (how consistent patterns are)
        const stabilityScore = calculateStabilityScore(sortedTrends);
        
        // Calculate time span
        const firstTrend = sortedTrends[0];
        const lastTrend = sortedTrends[sortedTrends.length - 1];
        const daysOfData = Math.max(1, Math.ceil(
          (lastTrend.timestamp.getTime() - firstTrend.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        ));

        const recent = sortedTrends[sortedTrends.length - 1];

        setAnalysis({
          trends: sortedTrends,
          confidenceTrend,
          accuracyTrend,
          learningVelocity,
          stabilityScore,
          daysOfData,
          recentConfidence: recent.confidenceScore,
          recentAccuracy: recent.accuracy
        });

      } catch (error) {
        console.warn('[usePatternTrends] Failed to analyze trends:', error);
        setAnalysis(null);
      }
    };

    analyzeTrends();
    
    // Update trends analysis periodically
    const interval = setInterval(analyzeTrends, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  return analysis;
}

/**
 * Calculate trend direction from a series of values
 */
function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' | 'insufficient-data' {
  if (values.length < 3) return 'insufficient-data';
  
  // Simple linear regression slope
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // Sum of indices 0,1,2...n-1
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares 0²+1²+...+(n-1)²
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  if (slope > 0.01) return 'improving';
  if (slope < -0.01) return 'declining';
  return 'stable';
}

/**
 * Calculate how fast the user's patterns are improving
 */
function calculateLearningVelocity(trends: PatternTrend[]): number {
  if (trends.length < 3) return 0;
  
  const recentTrends = trends.slice(-5); // Last 5 data points
  const confidenceChanges = [];
  const accuracyChanges = [];
  
  for (let i = 1; i < recentTrends.length; i++) {
    const prev = recentTrends[i - 1];
    const curr = recentTrends[i];
    
    confidenceChanges.push(curr.confidenceScore - prev.confidenceScore);
    accuracyChanges.push(curr.accuracy - prev.accuracy);
  }
  
  // Average positive changes (learning velocity)
  const avgConfidenceGain = confidenceChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / confidenceChanges.length;
  const avgAccuracyGain = accuracyChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / accuracyChanges.length;
  
  return Math.max(0, Math.min(1, (avgConfidenceGain + avgAccuracyGain) * 5)); // Scale to 0-1
}

/**
 * Calculate how stable/consistent the patterns are
 */
function calculateStabilityScore(trends: PatternTrend[]): number {
  if (trends.length < 3) return 0;
  
  // Calculate variance in chronotype stability
  const stabilities = trends.map(t => t.chronotypeStability);
  const mean = stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
  const variance = stabilities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / stabilities.length;
  
  // Lower variance = higher stability (invert and normalize)
  return Math.max(0, Math.min(1, 1 - variance * 2));
}