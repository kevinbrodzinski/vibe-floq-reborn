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
      speed: movementContext.speed,
      heading: movementContext.heading,
      isStationary: movementContext.isStationary,
      isWalking: movementContext.isWalking,
      isDriving: movementContext.isDriving,
      confidence: movementContext.confidence,
      lastUpdated: Date.now() // Always use current time since store doesn't have this
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
    speed: state.movementContext.speed,
    heading: state.movementContext.heading,
    isStationary: state.movementContext.isStationary,
    isWalking: state.movementContext.isWalking,
    isDriving: state.movementContext.isDriving,
    confidence: state.movementContext.confidence,
    lastUpdated: Date.now() // Always use current time since store doesn't have this
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