// src/hooks/useWeather.ts
// -----------------------------------------------------------------------------
// React-Query hook that fetches the current weather for the user’s coordinates
// using the `get_weather` Supabase Edge Function.
//
// Improvements vs. previous version
//  • Correctly treats 0 lat / 0 lng as valid values
//  • Uses AbortSignal from React-Query so in-flight requests are cancelled
//    if the component unmounts or the query key changes
//  • Strongly-typed payload (adjust the `Weather` interface to match the
//    response shape you return from the Edge Function)
//  • Converts Supabase errors to regular Error objects
//  • Disables “refetch on window focus” to avoid surprise network traffic
// -----------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';

export interface Weather {
  condition: string;       // e.g. "sunny"
  temperatureF: number;    // e.g. 72
  feelsLikeF: number;      // e.g. 70
  humidity: number;        // %
  windMph: number;         // mph
  icon: string;            // OpenWeather icon code, etc.
  created_at: string;      // ISO timestamp
}

/**
 * Fetches weather data for the user’s current position.
 * Returns a React-Query result object.
 */
export const useWeather = () => {
  const { coords, error: geoError, status } = useGeo();

  const lat = coords?.lat;
  const lng = coords?.lng;

  return useQuery<Weather>({
    queryKey: ['weather', lat, lng],

    /* Don’t run until we actually have coordinates and no geolocation error */
    enabled: lat !== undefined && lng !== undefined && !geoError,

    /* NETWORK CALL --------------------------------------------------------- */
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.functions.invoke<Weather>(
        'get_weather',
        {
          body: { lat, lng },
          signal, // allows cancellation
        },
      );

      if (error) throw new Error(error.message);
      if (!data) throw new Error('No weather data returned');

      return data;
    },

    /* QUERY OPTIONS -------------------------------------------------------- */
    staleTime: 10 * 60_000,          // 10 min – treat data as fresh
    cacheTime: 30 * 60_000,          // keep unused data for 30 min
    refetchOnWindowFocus: false,     // no surprise refetches
    retry: 2,                        // up to 2 retries on failure

    meta: { errorMessage: 'Failed to fetch weather data' },
  });
};