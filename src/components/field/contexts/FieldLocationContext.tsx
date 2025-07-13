import { createContext, useContext } from 'react';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
import { useBucketedPresence } from '@/hooks/useBucketedPresence';

interface FieldLocationContextValue {
  location: ReturnType<typeof useOptimizedGeolocation>;
  isLocationReady: boolean;
  presenceData: any[];
  lastHeartbeat: number | null;
}

const FieldLocationContext = createContext<FieldLocationContextValue | null>(null);

interface FieldLocationProviderProps {
  children: React.ReactNode;
  friendIds: string[];
}

export const FieldLocationProvider = ({ children, friendIds }: FieldLocationProviderProps) => {
  const location = useOptimizedGeolocation();
  const { people: presenceData, lastHeartbeat } = useBucketedPresence(location.lat, location.lng, friendIds);
  const isLocationReady = !!(location.lat && location.lng);

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

export const useFieldLocation = () => {
  const context = useContext(FieldLocationContext);
  if (!context) {
    throw new Error('useFieldLocation must be used within a FieldLocationProvider');
  }
  return context;
};