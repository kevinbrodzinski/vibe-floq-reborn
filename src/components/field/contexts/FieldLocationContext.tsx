
import { createContext, useContext, useEffect } from 'react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useBucketedPresence } from '@/hooks/useBucketedPresence';
import { PresenceErrorBoundary } from '@/components/presence/PresenceErrorBoundary';
import { FieldLocationErrorBoundary } from './FieldLocationErrorBoundary';

interface FieldLocationContextValue {
  location: ReturnType<typeof useUserLocation>;
  isLocationReady: boolean;
  presenceData: any[];
  lastHeartbeat: number | null;
}

const FieldLocationContext = createContext<FieldLocationContextValue | null>(null);

interface FieldLocationProviderProps {
  children: React.ReactNode;
  friendIds: string[];
}

const FieldLocationProviderInner = ({ children, friendIds }: FieldLocationProviderProps) => {
  const location = useUserLocation();
  const { people: presenceData, lastHeartbeat } = useBucketedPresence(location.pos?.lat, location.pos?.lng, friendIds);
  const isLocationReady = !!(location.pos?.lat && location.pos?.lng);

  // Only auto-start location tracking if permission hasn't been determined yet
  useEffect(() => {
    // Only auto-start if we don't have location data and no explicit error
    if (!location.isTracking && !location.error && !location.pos) {
      // Check permissions first to avoid re-prompting
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            location.startTracking();
          }
          // Don't auto-start if denied or prompt - let user manually trigger
        }).catch(() => {
          // If permissions API fails, don't auto-start to avoid re-prompts
        });
      }
    }
  }, [location.isTracking, location.error, location.startTracking, location.pos]);

  const value = {
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
