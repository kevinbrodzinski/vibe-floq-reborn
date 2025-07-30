
import React, { createContext, useContext, useEffect } from 'react';
import { useUserLocation }       from '@/hooks/useUserLocation';       // ← remains
import { useBucketedPresence }   from '@/hooks/useBucketedPresence';
import { PresenceErrorBoundary } from '@/components/presence/PresenceErrorBoundary';
import { FieldLocationErrorBoundary } from './FieldLocationErrorBoundary';

/* …types unchanged… */

const FieldLocationContext = createContext<FieldLocationContextValue | null>(null);

/* …props unchanged… */

const FieldLocationProviderInner = ({ children, friendIds }: FieldLocationProviderProps) => {
  const location = useUserLocation();                     // same hook
  const { pos, error, isTracking, startTracking } = location;

  /* 1️⃣  Presence: only call when we truly have coordinates */
  const lat = pos?.lat ?? null;
  const lng = pos?.lng ?? null;
  const { people: presenceData, lastHeartbeat } = useBucketedPresence(
    lat ?? undefined,
    lng ?? undefined,
    friendIds
  );

  const isLocationReady = lat !== null && lng !== null;

  /* 2️⃣  Auto-start only if permission already granted AND we’re idle */
  useEffect(() => {
    if (isTracking || pos || error) return;

    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(p => {
          if (p.state === 'granted') startTracking();
        })
        .catch(() => {/* silent */});
    }
  }, [isTracking, pos, error, startTracking]);

  /* –– context value –– */
  const value = { location, isLocationReady, presenceData, lastHeartbeat };

  return (
    <FieldLocationContext.Provider value={value}>
      {children}
    </FieldLocationContext.Provider>
  );
};

export const FieldLocationProvider = ({ children, friendIds }: FieldLocationProviderProps) => {
  return (
    <FieldLocationErrorBoundary>
      <PresenceErrorBoundary>
        <FieldLocationProviderInner friendIds={friendIds}>
          {children}
        </FieldLocationProviderInner>
      </PresenceErrorBoundary>
    </FieldLocationErrorBoundary>
  );
};

export const useFieldLocation = () => {
  const context = useContext(FieldLocationContext);
  if (!context) {
    throw new Error('useFieldLocation must be used within a FieldLocationProvider');
  }
  return context;
};
