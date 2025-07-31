/**
 * Consolidated location hooks - clear separation of concerns
 * 
 * Architecture:
 * - useLocationCore: Pure GPS coordinates (no tracking/sharing)
 * - useLocationTracking: GPS + server-side recording (no sharing)  
 * - useLocationSharing: GPS + tracking + live sharing with privacy
 * - useLocationDisplay: Coordinate formatting and geocoding
 * - useFriendLocations: Subscribe to friends' live locations
 */

// Core GPS functionality
export { useLocationCore } from './useLocationCore';
export type { LocationCoreOptions, LocationCoreState } from './useLocationCore';

// GPS + server tracking
export { useLocationTracking } from './useLocationTracking';
export type { LocationTrackingOptions } from './useLocationTracking';

// GPS + tracking + live sharing
export { useLocationSharing } from './useLocationSharing';
export type { LocationSharingOptions } from './useLocationSharing';

// Display utilities
export { useLocationDisplay } from '../useLocationDisplay';
export { useReverseGeocode } from '../useReverseGeocode';

// Friend location subscriptions
export { useFriendLocations } from '../useFriendLocations';

// Legacy compatibility - gradually migrate these
export { useGeo, useLatLng, useLocation, useGeoPos } from '../useGeo';
export { useMyLocation } from '../useMyLocation';

/**
 * MIGRATION GUIDE:
 * 
 * 1. For simple GPS coordinates:
 *    useGeo() → useLocationCore()
 * 
 * 2. For GPS + server recording:
 *    useUserLocation() → useLocationTracking()
 * 
 * 3. For GPS + recording + live sharing:
 *    useUserLocation() → useLocationSharing()
 * 
 * 4. For coordinate display:
 *    Continue using useLocationDisplay()
 * 
 * 5. For friend locations:
 *    Continue using useFriendLocations()
 */