import { useEffect } from 'react';
import { ConvergencePredictionEngine } from '@/lib/trajectory/ConvergencePredictionEngine';
import { socialCache } from '@/lib/social/socialCache';

/**
 * Hook to manage convergence prediction notifications
 * Integrates with existing social cache and friend data
 */
export function useConvergenceNotifications() {
  // Update trajectory data in the prediction engine
  useEffect(() => {
    const updateTrajectoryData = () => {
      const friends = socialCache.getFriendHeads();
      const myPath = socialCache.getMyPath();
      
      // The ConvergencePredictionEngine will use these via socialCache
      // This hook serves as the integration point between existing data and new predictions
    };

    // Update every 5 seconds when there's trajectory data
    const interval = setInterval(updateTrajectoryData, 5000);
    updateTrajectoryData(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return {
    // Expose utility methods if needed
    getUpcomingConvergences: ConvergencePredictionEngine.detectUpcomingConvergences,
    getCurrentTrajectories: ConvergencePredictionEngine.getCurrentTrajectories
  };
}