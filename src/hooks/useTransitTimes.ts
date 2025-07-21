import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface Location {
  lng: number;
  lat: number;
}

interface TransitResult {
  duration_minutes: number;
  distance_meters: number;
  provider: string;
  confidence: 'high' | 'medium' | 'low';
  mode: string;
  raw_data?: any;
}

interface UseTransitTimeOptions {
  from: Location;
  to: Location;
  mode?: 'walking' | 'driving' | 'cycling';
  enabled?: boolean;
}

export function useTransitTime({ from, to, mode = 'walking', enabled = true }: UseTransitTimeOptions) {
  return useQuery({
    queryKey: ['transit-time', from, to, mode],
    queryFn: async (): Promise<TransitResult> => {
      const { data, error } = await supabase.functions.invoke('get-transit', {
        body: {
          from,
          to,
          mode
        }
      })

      if (error) {
        console.error('Transit time fetch error:', error)
        throw error
      }

      return data as TransitResult
    },
    enabled: enabled && !!(from.lat && from.lng && to.lat && to.lng),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (renamed from cacheTime in newer versions)
    retry: 1
  })
}

// Helper function to calculate straight-line distance and estimate time
export function calculateHaversineTime(from: Location, to: Location, mode: 'walking' | 'driving' | 'cycling' = 'walking'): TransitResult {
  const R = 6371000; // Earth's radius in meters
  const φ1 = from.lat * Math.PI / 180;
  const φ2 = to.lat * Math.PI / 180;
  const Δφ = (to.lat - from.lat) * Math.PI / 180;
  const Δλ = (to.lng - from.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // Distance in meters

  // Speed assumptions (meters per minute)
  const speeds = {
    walking: 80,    // ~5 km/h
    cycling: 250,   // ~15 km/h  
    driving: 500    // ~30 km/h (city driving)
  };

  const durationMinutes = Math.max(1, Math.round(distance / speeds[mode]));

  return {
    duration_minutes: durationMinutes,
    distance_meters: Math.round(distance),
    provider: 'haversine',
    confidence: 'low',
    mode
  };
}

// Hook for multiple transit times between stop pairs
export function useMultipleTransitTimes(stops: Array<{ lat?: number; lng?: number }>, mode: 'walking' | 'driving' | 'cycling' = 'walking') {
  const transitPairs = stops.slice(0, -1).map((stop, index) => ({
    from: { lat: stop.lat || 0, lng: stop.lng || 0 },
    to: { lat: stops[index + 1]?.lat || 0, lng: stops[index + 1]?.lng || 0 },
    index
  })).filter(pair => pair.from.lat && pair.from.lng && pair.to.lat && pair.to.lng);

  const queries = transitPairs.map(pair => 
    useTransitTime({
      from: pair.from,
      to: pair.to,
      mode,
      enabled: true
    })
  );

  return {
    transitTimes: queries.map(query => query.data),
    isLoading: queries.some(query => query.isLoading),
    errors: queries.map(query => query.error).filter(Boolean)
  };
}