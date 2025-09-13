
// Location hooks - new architecture
export { useLocationCore, useLocationTracking, useLocationSharing } from './location';
export { useLocationDisplay } from './useLocationDisplay';
export { useFriendLocations } from './useFriendLocations';
export type { LocationCoreOptions, LocationCoreState, LocationTrackingOptions, LocationSharingOptions } from './location';

// Legacy location hooks (deprecated - use location/ exports above)
export { useGeo, useLatLng, useLocation, useGeoPos } from './useGeo';
export { useMyLocation } from './useMyLocation';
// useUserLocation has been deprecated and removed - use useUnifiedLocation from @/hooks/location/ instead

export { useShakeDetection } from './useShakeDetection';
export { useHapticFeedback } from './useHapticFeedback';
export { useFloqJoin } from './useFloqJoin';
export { useVenueJoin } from './useVenueJoin';
export { useVenueManager } from './useVenueManager';
export { useUnifiedFriends } from './useUnifiedFriends';
export { useFloqSuggestions } from './useFloqSuggestions';
export { useLiveFloqScore } from './useLiveFloqScore';
export { useMyFlocks } from './useMyFlocks';
export { useNearbyFlocks } from './useNearbyFlocks';
export { useFloqDetails } from './useFloqDetails';
export { useOfflineQueue } from './useOfflineQueue';
export { useFloqChat } from './useFloqChat';
export { useInviteToFloq } from './useInviteToFloq';
export { usePendingInvites } from './usePendingInvites';

export type { HapticPattern } from './useHapticFeedback';
export type { FloqSuggestion } from './useFloqSuggestions';
export type { MyFloq } from './useMyFlocks';
export type { NearbyFloq } from './useNearbyFlocks';
export type { FloqDetails } from './useFloqDetails';
export type { FloqMessage } from './useFloqChat';
export type { FloqInvitation } from './usePendingInvites';
