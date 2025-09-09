
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { safeVibe } from '@/lib/vibes';
import type { Vibe } from '@/lib/vibes';
import { fetchTileVenues, fetchSocialWeather } from '@/lib/api/mapClient';
import { useViewportInput } from '@/lib/map/useViewportInput';
import type { TileVenue, PressureCell } from '@/lib/api/mapContracts';

export interface FieldData {
  currentVibe: Vibe;
  vibeStrength: number;
  nearbyFloqs: any[];
  loading: boolean;
  // Additional properties for compatibility
  fieldTiles?: any[];
  tileIds?: string[];
  viewport?: any;
  floqEvents?: any[];
  showDebugVisuals?: boolean;
  walkableFloqs?: any[];
  realtime?: any;
  currentEvent?: any;
  nearbyVenues?: TileVenue[];
  weatherCells?: PressureCell[];
}

interface FieldDataContextType {
  fieldData: FieldData;
  updateVibe: (vibe: Vibe) => void;
  refreshData: () => void;
}

const FieldDataContext = createContext<FieldDataContextType | undefined>(undefined);

export function useFieldData() {
  const context = useContext(FieldDataContext);
  if (!context) {
    throw new Error('useFieldData must be used within a FieldDataProvider');
  }
  return context;
}

interface FieldDataProviderProps {
  children: ReactNode;
}

export function FieldDataProvider({ children }: FieldDataProviderProps) {
  const [currentVibe, setCurrentVibe] = useState<Vibe>('chill');
  const [vibeStrength, setVibeStrength] = useState(0.5);

  // Get viewport data from map
  const { viewport, viewportKey } = useViewportInput({ defaultRadius: 900 });

  // Fetch venues and weather data
  const qVenues = useQuery({
    queryKey: ['tile-venues', viewportKey],
    queryFn: () => fetchTileVenues(viewport),
    staleTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const qWeather = useQuery({
    queryKey: ['social-weather', viewportKey],
    queryFn: () => fetchSocialWeather(viewport),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const fieldData = useMemo<FieldData>(() => ({
    currentVibe,
    vibeStrength,
    nearbyFloqs: [],
    loading: qVenues.isLoading || qWeather.isLoading,
    // Additional properties for compatibility
    fieldTiles: [],
    tileIds: [],
    viewport: null,
    floqEvents: [],
    showDebugVisuals: false,
    walkableFloqs: [],
    realtime: null,
    currentEvent: null,
    nearbyVenues: qVenues.data?.venues ?? [],
    weatherCells: qWeather.data?.cells ?? [],
  }), [currentVibe, vibeStrength, qVenues.isLoading, qWeather.isLoading, qVenues.data, qWeather.data]);

  const updateVibe = (vibe: Vibe) => {
    const validVibe = safeVibe(vibe);
    setCurrentVibe(validVibe);
  };

  const refreshData = () => {
    qVenues.refetch();
    qWeather.refetch();
  };

  return (
    <FieldDataContext.Provider value={{
      fieldData,
      updateVibe,
      refreshData,
    }}>
      {children}
    </FieldDataContext.Provider>
  );
}
