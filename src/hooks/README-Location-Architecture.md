/**
 * Location Hooks Architecture
 * 
 * This app uses two distinct location systems with different purposes:
 * 
 * ## useGeo - Simple Location Sensor
 * **Purpose**: Lightweight location access for UI components
 * **Best for**: 
 * - Weather components
 * - Venue distance calculations  
 * - Basic maps
 * - Any component that just needs coordinates
 * 
 * **Features**:
 * - Battery efficient
 * - SSR-safe
 * - Minimal permissions overhead
 * - Simple coordinate output
 * 
 * **Returns**: `{ coords: {lat, lng}, status, accuracy, requestLocation, clearWatch }`
 * 
 * **Example**:
 * ```typescript
 * const { coords, status } = useGeo({ watch: true });
 * if (coords) {
 *   // Use coords.lat, coords.lng for weather API
 * }
 * ```
 * 
 * ## useUserLocation - Complex Location Sharing System
 * **Purpose**: Real-time location sharing with privacy controls and presence broadcasting
 * **Best for**:
 * - Field canvas with live user positions
 * - Live location demos
 * - Real-time presence systems
 * - Auto check-ins at venues
 * - ETA sharing with friends
 * 
 * **Features**:
 * - Real-time Supabase channels for live sharing
 * - Privacy filters and coordinate snapping
 * - Context detection (floqs, venues, walking)
 * - Location history batching to database
 * - Smart sharing rules and permissions
 * - Presence broadcasting to friends
 * 
 * **Returns**: `{ location, isTracking, loading, error, pos, startTracking, stopTracking }`
 * 
 * **Example**:
 * ```typescript
 * const { pos, isTracking, startTracking } = useUserLocation();
 * // pos includes real-time coordinates shared with friends
 * // isTracking indicates if actively broadcasting location
 * ```
 * 
 * ## iOS Optimization
 * Both hooks include iOS-friendly settings:
 * - Proper timeout values for CoreLocation
 * - Capacitor detection for native environments
 * - Coordination to prevent GPS conflicts
 * 
 * ## When to Use Which?
 * 
 * **Use useGeo when**:
 * - You need basic coordinates for calculations
 * - Building simple UI components 
 * - Don't need real-time sharing
 * - Want minimal battery impact
 * 
 * **Use useUserLocation when**:
 * - Building live sharing features
 * - Need presence broadcasting
 * - Want location history tracking
 * - Building field/map-based social features
 */