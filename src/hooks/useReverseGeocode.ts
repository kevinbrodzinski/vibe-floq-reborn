import { useState, useEffect, useRef } from 'react';

interface ReverseGeocodeResult {
  address: string | null;
  loading: boolean;
  error: string | null;
}

interface NominatimResponse {
  display_name: string;
  address?: {
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// Cache for geocoding results
const geocodeCache = new Map<string, string>();

export const useReverseGeocode = (lat?: number, lng?: number) => {
  const [result, setResult] = useState<ReverseGeocodeResult>({
    address: null,
    loading: false,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lat || !lng) {
      setResult({ address: null, loading: false, error: null });
      return;
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      setResult({
        address: geocodeCache.get(cacheKey)!,
        loading: false,
        error: null,
      });
      return;
    }

    // Debounce the request
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          {
            signal: abortControllerRef.current.signal,
            headers: {
              'User-Agent': 'FloqApp/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Geocoding service unavailable');
        }

        const data: NominatimResponse = await response.json();
        
        // Format the address for display
        let formattedAddress = '';
        if (data.address) {
          const { neighbourhood, suburb, city, town, village, state } = data.address;
          const locality = neighbourhood || suburb || city || town || village;
          
          if (locality && state) {
            formattedAddress = `${locality}, ${state}`;
          } else if (locality) {
            formattedAddress = locality;
          } else if (state) {
            formattedAddress = state;
          } else {
            // Fallback to a simplified version of display_name
            const parts = data.display_name.split(',').slice(0, 2);
            formattedAddress = parts.join(',').trim();
          }
        }

        if (!formattedAddress) {
          formattedAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        // Cache the result
        geocodeCache.set(cacheKey, formattedAddress);
        
        // Limit cache size
        if (geocodeCache.size > 100) {
          const firstKey = geocodeCache.keys().next().value;
          geocodeCache.delete(firstKey);
        }

        setResult({
          address: formattedAddress,
          loading: false,
          error: null,
        });

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled
        }

        console.warn('Reverse geocoding failed:', error);
        
        // Fallback to coordinates
        const fallbackAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        setResult({
          address: fallbackAddress,
          loading: false,
          error: 'Could not get address',
        });
      }
    }, 500); // 500ms debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [lat, lng]);

  return result;
};