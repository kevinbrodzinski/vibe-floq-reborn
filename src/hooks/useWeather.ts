// src/hooks/useWeather.ts
// -----------------------------------------------------------------------------
// React-Query hook that fetches the current weather for the user's coordinates
// using the `get_weather` Supabase Edge Function.
//
// Improvements vs. previous version
//  • Correctly treats 0 lat / 0 lng as valid values
//  • Uses AbortSignal from React-Query so in-flight requests are cancelled
//    if the component unmounts or the query key changes
//  • Strongly-typed payload (adjust the `Weather` interface to match the
//    response shape you return from the Edge Function)
//  • Converts Supabase errors to regular Error objects
//  • Disables "refetch on window focus" to avoid surprise network traffic
//  • Added support for future weather forecasts with dateTime parameter
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
  precipChancePct?: number; // precipitation chance % (0-100)
}

/**
 * Fetches weather data for the specified coordinates or user's current position.
 * @param dateTime - Optional ISO string for future weather forecast. If not provided, fetches current weather.
 * @param overrideLat - Optional latitude to override current location
 * @param overrideLng - Optional longitude to override current location
 * Returns a React-Query result object.
 */
export const useWeather = (dateTime?: string, overrideLat?: number, overrideLng?: number) => {
  const { coords, error: geoError, status } = useGeo();

  // Use override coordinates if provided, otherwise fall back to current location
  const lat = overrideLat ?? coords?.lat;
  const lng = overrideLng ?? coords?.lng;

  return useQuery<Weather>({
    queryKey: ['weather', lat, lng, dateTime],

    /* Don't run until we actually have coordinates and no geolocation error (unless overrides provided) */
    enabled: lat !== undefined && lng !== undefined && (overrideLat !== undefined || !geoError),

    /* NETWORK CALL --------------------------------------------------------- */
    queryFn: async ({ signal }) => {
      const payload: { lat: number; lng: number; dateTime?: string } = { lat: lat!, lng: lng! };
      if (dateTime) {
        payload.dateTime = dateTime;
      }

      const { data, error } = await supabase.functions.invoke<Weather>(
        'get_weather',
        {
          body: payload,
          signal, // allows cancellation
        },
      );

      if (error) throw new Error(error.message);
      if (!data) throw new Error('No weather data returned');

      return data;
    },

    /* QUERY OPTIONS -------------------------------------------------------- */
    staleTime: dateTime ? 30 * 60_000 : 10 * 60_000,  // 30 min for forecasts, 10 min for current
    cacheTime: dateTime ? 60 * 60_000 : 30 * 60_000,  // 60 min for forecasts, 30 min for current
    refetchOnWindowFocus: false,     // no surprise refetches
    retry: 2,                        // up to 2 retries on failure

    meta: { errorMessage: 'Failed to fetch weather data' },
  });
};