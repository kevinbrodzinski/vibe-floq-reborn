import { useCallback, useRef, useState } from 'react';
import { fetchNearestVenue } from '@/lib/nearestVenue';

export type VenueCache = Record<string, { name: string; venue_id: string; distance_m: number } | undefined>;

export function useVenueNameCache(opts?: { maxM?: number }) {
  const [cache, setCache] = useState<VenueCache>({});
  const inflight = useRef<Map<string, Promise<void>>>(new Map());
  const maxM = opts?.maxM ?? 200;

  const prefetch = useCallback(async (key: string, lat: number, lng: number) => {
    if (cache[key] || inflight.current.has(key)) return;
    
    const p = (async () => {
      try {
        const v = await fetchNearestVenue(lat, lng, maxM);
        setCache((c) => ({ 
          ...c, 
          [key]: v ? { 
            name: v.name, 
            venue_id: v.venue_id, 
            distance_m: v.distance_m 
          } : undefined 
        }));
      } catch (error) {
        console.warn(`Failed to fetch venue for ${key}:`, error);
        // Cache undefined to avoid retrying immediately
        setCache((c) => ({ ...c, [key]: undefined }));
      }
    })().finally(() => inflight.current.delete(key));
    
    inflight.current.set(key, p);
    await p;
  }, [cache, maxM]);

  const getVenueName = useCallback((key: string) => {
    return cache[key]?.name;
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache({});
    inflight.current.clear();
  }, []);

  return { 
    cache, 
    prefetch, 
    getVenueName,
    clearCache 
  };
}