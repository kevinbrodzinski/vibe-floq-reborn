import { useCallback } from 'react';
import { usePostGISLocation } from './usePostGISLocation';
import { useLocationMetrics } from './useLocationMetrics';
import { useGeo } from './useGeo';

/**
 * Migration hook that provides a unified interface between old and new location systems
 * This helps transition existing code gradually to the new PostGIS system
 */
export function useLocationMigration() {
  const { coords, status } = useGeo({ watch: true });
  const { updateLivePosition, getNearbyPositions } = usePostGISLocation();
  const { recordMetric } = useLocationMetrics();

  /**
   * Enhanced position update that works with both systems
   * Automatically records metrics and handles errors gracefully
   */
  const updatePosition = useCallback(async (options: {
    vibe?: string;
    visibility?: 'public' | 'friends' | 'private';
  } = {}) => {
    if (!coords) {
      throw new Error('No GPS coordinates available');
    }

    const startTime = Date.now();
    
    try {
      // Use the new PostGIS system
      const result = await updateLivePosition(
        coords.lat,
        coords.lng,
        {
          vibe: options.vibe,
          visibility: options.visibility
        }
      );

      // Record success metric
      await recordMetric('sharing_operation', 1, {
        operation: 'update_position',
        success: true,
        duration_ms: Date.now() - startTime
      });

      return result;
    } catch (error) {
      // Record error metric
      await recordMetric('error', 1, {
        operation: 'update_position',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime
      });
      throw error;
    }
  }, [coords, updateLivePosition, recordMetric]);

  /**
   * Get nearby users with automatic metrics recording
   */
  const getNearbyUsers = useCallback(async (radiusMeters: number = 250) => {
    if (!coords) {
      throw new Error('No GPS coordinates available');
    }

    const startTime = Date.now();

    try {
      const result = await getNearbyPositions(
        coords.lat,
        coords.lng,
        radiusMeters
      );

      // Record performance metric
      await recordMetric('performance', Date.now() - startTime, {
        operation: 'get_nearby_positions',
        radius_m: radiusMeters,
        results_count: result.length
      });

      return result;
    } catch (error) {
      await recordMetric('error', 1, {
        operation: 'get_nearby_positions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [coords, getNearbyPositions, recordMetric]);

  return {
    // GPS state from legacy system
    coords,
    status,
    isReady: status === 'success' && !!coords,
    
    // Enhanced PostGIS operations
    updatePosition,
    getNearbyUsers,
    
    // Direct access to PostGIS hooks for advanced usage
    postGIS: { updateLivePosition, getNearbyPositions },
    recordMetric
  };
}