
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

  // Automatically start location tracking when component mounts
  useEffect(() => {
    if (!location.isTracking && !location.error) {
      location.startTracking();
    }
  }, [location.isTracking, location.error, location.startTracking]);

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
