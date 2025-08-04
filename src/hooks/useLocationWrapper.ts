/**
 * useLocationWrapper - Migration wrapper for existing components
 * 
 * Provides backward compatibility while slowly migrating to useLiveLocation
 * Uses feature flag to switch between old and new systems
 */

import { isLocationV2Enabled } from '@/lib/feature-flags';
import { useLiveLocation } from './useLiveLocation';
import { useUserLocation } from './useUserLocation';

export function useLocationWrapper() {
  const useV2 = isLocationV2Enabled();
  
  if (useV2) {
    // New system - unified location
    const location = useLiveLocation();
    return {
      ...location,
      // Ensure backward compatibility
      startTracking: () => Promise.resolve(),
      stopTracking: () => Promise.resolve(),
      checkPermission: () => Promise.resolve(location.hasPermission),
      resetLocation: () => Promise.resolve(),
      setLocation: () => {}
    };
  } else {
    // Old system - keep using existing hooks
    return useUserLocation();
  }
}
