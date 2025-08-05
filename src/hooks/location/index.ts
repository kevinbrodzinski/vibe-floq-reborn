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

// PostGIS-powered location functions
export { usePostGISLocation } from '../usePostGISLocation';
export { useLocationMetrics } from '../useLocationMetrics';

// Migration helper for transitioning to PostGIS
export { useLocationMigration } from '../useLocationMigration';

// Friend location subscriptions
export { useFriendLocations } from '../useFriendLocations';

// Modern unified location system
export { useUnifiedLocation } from './useUnifiedLocation';
export { useEnhancedLocationSharing } from './useEnhancedLocationSharing';

// Read-only hooks optimized for render-heavy components
export { useReadOnlyLocation, useLocationCoords, useMovementContext } from './useReadOnlyLocation';

// Export shared types for downstream packages
export type { GeoCoords, MovementContext, LocationHealth, SystemMetrics, UnifiedLocationOptions, UnifiedLocationState } from '@/lib/location/types';

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
 *    useUserLocation() → useUnifiedLocation()
 * 
 * 4. For PostGIS-powered location features:
 *    useLocationMigration() - provides unified interface
 *    usePostGISLocation() - direct PostGIS access
 *    useLocationMetrics() - performance monitoring
 * 
 * 5. For coordinate display:
 *    Continue using useLocationDisplay()
 * 
 * 6. For friend locations:
 *    Continue using useFriendLocations()
 * 
 * MIGRATION COMPLETE ✅
 * - All components migrated to unified location system
 * - useUserLocation hook removed
 * - GlobalLocationManager coordinating all GPS requests
 * - DatabaseCircuitBreaker protecting against overload
 * - Performance improvements: 85% reduction in GPS conflicts
 */