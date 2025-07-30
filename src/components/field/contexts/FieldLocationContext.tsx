
import { createContext, useContext } from 'react';
import { useGeo } from '@/hooks/useGeo';
import { useBucketedPresence } from '@/hooks/useBucketedPresence';
import { PresenceErrorBoundary } from '@/components/presence/PresenceErrorBoundary';
import { FieldLocationErrorBoundary } from './FieldLocationErrorBoundary';

interface FieldLocationContextValue {
  location: ReturnType<typeof useGeo>;
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
  const location = useGeo();
  const { people: presenceData, lastHeartbeat } = useBucketedPresence(location.coords?.lat, location.coords?.lng, friendIds);
  const isLocationReady = !!(location.coords?.lat && location.coords?.lng);

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
