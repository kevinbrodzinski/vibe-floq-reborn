
import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useViewportInput } from '@/lib/map/useViewportInput';
import { fetchTileVenues, fetchSocialWeather } from '@/lib/api/mapClient';
import type { TileVenue, PressureCell } from '@/lib/api/mapContracts';

export type FieldData = {
  nearbyVenues: TileVenue[] | undefined;
  weatherCells: PressureCell[] | undefined;
  loading: boolean;
  refetch: () => void;
  // Legacy compatibility props
  floqEvents?: any[];
  fieldTiles?: any[];
  showDebugVisuals?: boolean;
  tileIds?: string[];
  viewport?: any;
  walkableFloqs?: any[];
  realtime?: any;
  currentEvent?: any;
};

const FieldDataCtx = createContext<FieldData | null>(null);

export function useFieldData() {
  const v = useContext(FieldDataCtx);
  if (!v) throw new Error('useFieldData must be used within FieldDataProvider');
  return v;
}

export function FieldDataProvider({ children }: { children: React.ReactNode }) {
  const { viewport, viewportKey } = useViewportInput({ defaultRadius: 900 });

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

  const value = useMemo<FieldData>(() => ({
    nearbyVenues: qVenues.data?.venues,
    weatherCells: qWeather.data?.cells,
    loading: qVenues.isLoading || qWeather.isLoading,
    refetch: () => { qVenues.refetch(); qWeather.refetch(); },
    // Legacy compatibility props
    floqEvents: [],
    fieldTiles: [],
    showDebugVisuals: false,
    tileIds: [],
    viewport: null,
    walkableFloqs: [],
    realtime: null,
    currentEvent: null,
  }), [qVenues.data, qWeather.data, qVenues.isLoading, qWeather.isLoading]);

  return <FieldDataCtx.Provider value={value}>{children}</FieldDataCtx.Provider>;
}
