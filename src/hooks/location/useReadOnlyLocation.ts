import { useLocationStore } from '@/lib/store/useLocationStore';
import type { GeoCoords, MovementContext } from '@/lib/location/types';

/**
 * Read-only location hook optimized for render-heavy components like maps
 * Only subscribes to essential location data to minimize re-renders
 */
export interface ReadOnlyLocationState {
  coords: GeoCoords | null;
  movementContext: MovementContext | null;
  timestamp: number | null;
  hasPermission: boolean;
  status: 'loading' | 'success' | 'error' | 'idle';
}

export function useReadOnlyLocation(): ReadOnlyLocationState {
  // Use selective subscriptions to minimize re-renders
  const coords = useLocationStore((state) => 
    state.coords ? {
      lat: state.coords.lat,
      lng: state.coords.lng,
      accuracy: state.coords.accuracy,
      timestamp: state.timestamp || undefined
    } : null
  );
  
  const movementContext = useLocationStore((state) => state.movementContext);
  const timestamp = useLocationStore((state) => state.timestamp);
  const hasPermission = useLocationStore((state) => state.hasPermission);
  const status = useLocationStore((state) => state.status);

  return {
    coords,
    movementContext: movementContext ? {
      ...movementContext,
      lastUpdated: movementContext.lastUpdated || Date.now()
    } : null,
    timestamp,
    hasPermission,
    status
  };
}

/**
 * Even more minimal hook - only coordinates for basic map centering
 */
export function useLocationCoords(): GeoCoords | null {
  return useLocationStore((state) => 
    state.coords ? {
      lat: state.coords.lat,
      lng: state.coords.lng,
      accuracy: state.coords.accuracy,
      timestamp: state.timestamp || undefined
    } : null
  );
}

/**
 * Movement context only - for components that need movement classification
 */
export function useMovementContext(): MovementContext | null {
  return useLocationStore((state) => state.movementContext ? {
    ...state.movementContext,
    heading: state.movementContext.heading || null,
    lastUpdated: state.movementContext.lastUpdated || Date.now()
  } : {
    speed: 0,
    heading: null,
    isStationary: true,
    isWalking: false,
    isDriving: false,
    confidence: 0.9,
    lastUpdated: Date.now()
  });
}