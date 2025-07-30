/* FieldLocationContext.tsx
 * – Keeps useUserLocation as-is
 * – Guards undefined lat/lng before presence query
 * – Safer auto-start logic to avoid double-prompt
 */

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
} from 'react';

import { useUserLocation }             from '@/hooks/useUserLocation';
import { useBucketedPresence }         from '@/hooks/useBucketedPresence';
import { PresenceErrorBoundary }       from '@/components/presence/PresenceErrorBoundary';
import { FieldLocationErrorBoundary }  from './FieldLocationErrorBoundary';

/* ---------- types ---------- */

interface FieldLocationContextValue {
  location: ReturnType<typeof useUserLocation>;
  isLocationReady: boolean;
  presenceData: any[];          // refine later if you have a Presence type
  lastHeartbeat: number | null;
}

const FieldLocationContext = createContext<FieldLocationContextValue | null>(
  null
);

interface FieldLocationProviderProps {
  children: ReactNode;
  friendIds: string[];
}

/* ---------- inner provider ---------- */

const FieldLocationProviderInner = ({
  children,
  friendIds,
}: FieldLocationProviderProps) => {
  const location = useUserLocation();
  const { pos, error, isTracking, startTracking } = location;

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

  /* auto-start only if permission already granted and we're idle */
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

  const value: FieldLocationContextValue = {
    location,
    isLocationReady,
    presenceData,
    lastHeartbeat,
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
}: FieldLocationProviderProps) => (
  <FieldLocationErrorBoundary>
    <PresenceErrorBoundary>
      <FieldLocationProviderInner friendIds={friendIds}>
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