/* FieldLocationContext.tsx
 * – Enhanced location context with geofencing, venue detection, and proximity tracking
 * – Integrates useEnhancedLocationSharing for comprehensive location intelligence
 * – Maintains backwards compatibility with existing field components
 */

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
} from 'react';

import { useUserLocation }             from '@/hooks/useUserLocation';
import { useEnhancedLocationSharing, type EnhancedLocationState } from '@/hooks/location/useEnhancedLocationSharing';
import { useBucketedPresence }         from '@/hooks/useBucketedPresence';
import { PresenceErrorBoundary }       from '@/components/presence/PresenceErrorBoundary';
import { FieldLocationErrorBoundary }  from './FieldLocationErrorBoundary';

/* ---------- types ---------- */

interface FieldLocationContextValue {
  // Legacy location interface for backwards compatibility
  location: ReturnType<typeof useUserLocation>;
  isLocationReady: boolean;
  presenceData: any[];          
  lastHeartbeat: number | null;
  
  // Enhanced location features
  enhancedLocation: EnhancedLocationState;
  startEnhancedSharing: () => Promise<void>;
  stopEnhancedSharing: () => Promise<void>;
  
  // Enhanced feature flags
  hasActiveGeofences: boolean;
  hasNearbyUsers: boolean;
  currentVenueConfidence: number;
  isLocationHidden: boolean;
}

const FieldLocationContext = createContext<FieldLocationContextValue | null>(
  null
);

interface FieldLocationProviderProps {
  children: ReactNode;
  friendIds: string[];
  // Enhanced location options
  enableGeofencing?: boolean;
  enableVenueDetection?: boolean;
  enableProximityTracking?: boolean;
  debugMode?: boolean;
}

/* ---------- inner provider ---------- */

const FieldLocationProviderInner = ({
  children,
  friendIds,
  enableGeofencing = true,
  enableVenueDetection = true,
  enableProximityTracking = true,
  debugMode = false,
}: FieldLocationProviderProps) => {
  const location = useUserLocation();
  const { pos, error, isTracking, startTracking } = location;
  
  // Enhanced location sharing with all features enabled
  const enhancedLocationSharing = useEnhancedLocationSharing({
    enableGeofencing,
    enableVenueDetection,
    enableProximityTracking,
    updateInterval: 30000, // 30 seconds
    debugMode: debugMode || process.env.NODE_ENV === 'development'
  });

  const [enhancedSharingActive, setEnhancedSharingActive] = useState(false);

  /* lat/lng may be undefined until the first fix arrives */
  const lat = pos?.lat ?? null;
  const lng = pos?.lng ?? null;

  const {
    people: presenceData,
    lastHeartbeat,
  } = useBucketedPresence(
    lat ?? undefined,
    lng ?? undefined,
    friendIds
  );

  const isLocationReady = lat !== null && lng !== null;

  /* auto-start enhanced location sharing when location is ready */
  useEffect(() => {
    if (isLocationReady && !enhancedSharingActive && !enhancedLocationSharing.isTracking) {
      enhancedLocationSharing.startSharing().then(() => {
        setEnhancedSharingActive(true);
        if (debugMode) {
          console.log('[FieldLocationContext] Enhanced location sharing activated');
        }
      }).catch((error) => {
        console.error('[FieldLocationContext] Failed to start enhanced sharing:', error);
      });
    }
  }, [isLocationReady, enhancedSharingActive, enhancedLocationSharing.isTracking, enhancedLocationSharing.startSharing, debugMode]);

  /* auto-start basic location tracking only if permission already granted and we're idle */
  useEffect(() => {
    if (isTracking || pos || error) return;

    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((p) => {
          if (p.state === 'granted') {
            try {
              startTracking();
            } catch (err) {
              console.warn('[FieldLocationContext] Auto-start failed:', err);
            }
          }
          /* if 'prompt' or 'denied', let UI button handle it */
        })
        .catch(() => {
          /* ignore Permissions API failure */
        });
    }
  }, [isTracking, pos, error, startTracking]);

  // Enhanced sharing control functions
  const startEnhancedSharing = async () => {
    try {
      await enhancedLocationSharing.startSharing();
      setEnhancedSharingActive(true);
    } catch (error) {
      console.error('[FieldLocationContext] Failed to start enhanced sharing:', error);
      throw error;
    }
  };

  const stopEnhancedSharing = async () => {
    try {
      await enhancedLocationSharing.stopSharing();
      setEnhancedSharingActive(false);
    } catch (error) {
      console.error('[FieldLocationContext] Failed to stop enhanced sharing:', error);
      throw error;
    }
  };

  const value: FieldLocationContextValue = {
    // Legacy interface
    location,
    isLocationReady,
    presenceData,
    lastHeartbeat,
    
    // Enhanced features
    enhancedLocation: {
      location: enhancedLocationSharing.location,
      accuracy: enhancedLocationSharing.accuracy,
      isTracking: enhancedLocationSharing.isTracking,
      geofenceMatches: enhancedLocationSharing.geofenceMatches,
      privacyFiltered: enhancedLocationSharing.privacyFiltered,
      privacyLevel: enhancedLocationSharing.privacyLevel,
      venueDetections: enhancedLocationSharing.venueDetections,
      currentVenue: enhancedLocationSharing.currentVenue,
      nearbyUsers: enhancedLocationSharing.nearbyUsers,
      proximityEvents: enhancedLocationSharing.proximityEvents,
      lastUpdate: enhancedLocationSharing.lastUpdate,
      error: enhancedLocationSharing.error
    },
    startEnhancedSharing,
    stopEnhancedSharing,
    
    // Enhanced feature flags
    hasActiveGeofences: enhancedLocationSharing.hasActiveGeofences,
    hasNearbyUsers: enhancedLocationSharing.hasNearbyUsers,
    currentVenueConfidence: enhancedLocationSharing.currentVenueConfidence,
    isLocationHidden: enhancedLocationSharing.isLocationHidden,
  };

  return (
    <FieldLocationContext.Provider value={value}>
      {children}
    </FieldLocationContext.Provider>
  );
};

/* ---------- exported wrapper ---------- */

export const FieldLocationProvider = ({
  children,
  friendIds,
  enableGeofencing,
  enableVenueDetection,
  enableProximityTracking,
  debugMode,
}: FieldLocationProviderProps) => (
  <FieldLocationErrorBoundary>
    <PresenceErrorBoundary>
      <FieldLocationProviderInner 
        friendIds={friendIds}
        enableGeofencing={enableGeofencing}
        enableVenueDetection={enableVenueDetection}
        enableProximityTracking={enableProximityTracking}
        debugMode={debugMode}
      >
        {children}
      </FieldLocationProviderInner>
    </PresenceErrorBoundary>
  </FieldLocationErrorBoundary>
);

/* ---------- convenience hook ---------- */

export const useFieldLocation = () => {
  const ctx = useContext(FieldLocationContext);
  if (!ctx) {
    throw new Error('useFieldLocation must be used within a FieldLocationProvider');
  }
  return ctx;
};