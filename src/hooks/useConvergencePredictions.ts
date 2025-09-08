import { useState, useEffect } from 'react';
import { SocialPhysicsCalculator } from '@/lib/field/physics';
import type { EnhancedFieldTile } from '@/types/field';

interface ConvergencePrediction {
  tileA: string;
  tileB: string;
  meetingPoint: { lat: number; lng: number };
  timeToMeet: number;
  probability: number;
}

/**
 * Hook for real-time convergence predictions between field tiles
 * Updates predictions every 5 seconds based on current tile states
 */
export function useConvergencePredictions(tiles: EnhancedFieldTile[]) {
  const [predictions, setPredictions] = useState<ConvergencePrediction[]>([]);

  useEffect(() => {
    if (!tiles.length) {
      setPredictions([]);
      return;
    }

    const updatePredictions = () => {
      const newPredictions: ConvergencePrediction[] = [];

      // Check all tile pairs for convergence
      for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
          const tileA = tiles[i];
          const tileB = tiles[j];
          
          const convergence = SocialPhysicsCalculator.detectConvergence(tileA, tileB);
          
          if (convergence && convergence.probability > 0.6) {
            // Calculate meeting point
            const meetingPoint = SocialPhysicsCalculator.predictMeetingPoint(
              tileA, 
              tileB, 
              convergence.time_to_converge
            );
            
            if (meetingPoint) {
              newPredictions.push({
                tileA: tileA.tile_id,
                tileB: tileB.tile_id,
                meetingPoint,
                timeToMeet: convergence.time_to_converge,
                probability: convergence.probability
              });
            }
          }
        }
      }

      // Sort by probability (highest first) and time to meet (soonest first)
      newPredictions.sort((a, b) => {
        if (Math.abs(a.probability - b.probability) > 0.1) {
          return b.probability - a.probability;
        }
        return a.timeToMeet - b.timeToMeet;
      });

      setPredictions(newPredictions);
    };

    // Initial calculation
    updatePredictions();

    // Update predictions every 5 seconds
    const interval = setInterval(updatePredictions, 5000);
    
    return () => clearInterval(interval);
  }, [tiles]);

  // Filter predictions by minimum probability threshold
  const getHighConfidencePredictions = (minProbability: number = 0.8) => {
    return predictions.filter(p => p.probability >= minProbability);
  };

  // Get predictions for a specific tile
  const getPredictionsForTile = (tileId: string) => {
    return predictions.filter(p => p.tileA === tileId || p.tileB === tileId);
  };

  // Get imminent predictions (within next 2 minutes)
  const getImminentPredictions = () => {
    return predictions.filter(p => p.timeToMeet <= 120); // 2 minutes
  };

  return {
    predictions,
    getHighConfidencePredictions,
    getPredictionsForTile,
    getImminentPredictions,
    // Statistics
    totalPredictions: predictions.length,
    averageProbability: predictions.length > 0 
      ? predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length 
      : 0,
    averageTimeToMeet: predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.timeToMeet, 0) / predictions.length
      : 0
  };
}