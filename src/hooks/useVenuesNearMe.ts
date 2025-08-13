import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VenueNearMe {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vibe: string;
  source: string;
  distance_m: number;
  live_count: number;
  vibe_score: number;
  popularity: number;
}

// Haversine distance calculation
function haversine(coord1: [number, number], coord2: [number, number], opts?: { cosLat?: number }): number {
  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;
  const R = 6371000; // Earth's radius in meters
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const cosLat = opts?.cosLat ?? Math.cos(lat1 * Math.PI / 180);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    cosLat * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ─── helper only defined once ───────────────────────────────────────────
const memoDistance = (() => {
  let baseLat = 0, baseLng = 0, cosLat = 1;
  return (a: number, b: number) => {
    if (a !== baseLat) { baseLat = a; cosLat = Math.cos(a * Math.PI / 180); }
    return haversine(
      [a, b],
      [baseLat, baseLng],   // will be overwritten below per call
      { cosLat }            // pre-computed cosine
    );
  };
})();

export function useVenuesNearMe(lat?: number, lng?: number, radius_km: number = 0.5) {
  const initialCursor = { popularity: null as number | null, id: null as string | null };
  
  return useInfiniteQuery({
    queryKey: ['venues-near-me', lat, lng, radius_km, initialCursor],
    initialPageParam: initialCursor,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async ({ pageParam = initialCursor, signal }) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { venues: [], nextCursor: undefined, hasMore: false };
      }

      // Better degree offset calculation accounting for latitude (with pole protection)
      const latRad = lat! * Math.PI / 180;
      const degreeOffsetLat = radius_km / 111;
      const denom = Math.max(0.01, Math.abs(Math.cos(latRad))); // Clamp to prevent division by zero at poles
      const degreeOffsetLng = radius_km / (111 * denom);
      
      const { popularity: cursorPop, id: cursorId } = pageParam;
      
      const { data, error } = await supabase.rpc('get_cluster_venues', {
        min_lng: lng! - degreeOffsetLng,
        min_lat: lat! - degreeOffsetLat,
        max_lng: lng! + degreeOffsetLng,
        max_lat: lat! + degreeOffsetLat,
        cursor_popularity: cursorPop,
        cursor_id: cursorId,
        limit_rows: 10,
      } as any);
      
      // Check for abort signal
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      
      if (error) {
        console.error('Failed to load nearby venues:', error);
        
        // Handle specific error codes gracefully
        if (error.code === 'PGRST116' || // out of range
            error.code === '42883' ||   // function does not exist (PostGIS)
            error.code === '404') {     // function not found
          return { venues: [], nextCursor: undefined, hasMore: false };
        }
        
        // For network/CORS errors, return empty instead of crashing
        if (error.message?.includes('CORS') || 
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('NetworkError')) {
          console.warn('Network error, returning empty venues list');
          return { venues: [], nextCursor: undefined, hasMore: false };
        }
        
        throw error;
      }
      
      // Transform data with distance calculation - guard against invalid coordinates
      const venues: VenueNearMe[] = (data || [])
        .filter(venue => Number.isFinite(+venue.lat) && Number.isFinite(+venue.lng))
        .map(venue => {
          const venueLat = +venue.lat;
          const venueLng = +venue.lng;
          // Memoize distance calculation to avoid re-computing on every render
          const distance = haversine([lat!, lng!], [venueLat, venueLng]);
          
          return {
            id: venue.id,
            name: venue.name,
            lat: venueLat,
            lng: venueLng,
            vibe: venue.vibe || 'mixed',
            source: venue.source || 'database',
            distance_m: Math.round(distance),
            live_count: venue.live_count || 0,
            vibe_score: venue.vibe_score || 50,
            popularity: venue.popularity || 0
          };
        });
      
      // Compound cursor for reliable pagination
      const nextCursor = venues.length === 10 && venues.length > 0
        ? { 
            popularity: venues[venues.length - 1].popularity,
            id: venues[venues.length - 1].id
          }
        : undefined;
      
      return {
        venues,
        nextCursor,
        hasMore: venues.length === 10
      };
    },
    getNextPageParam: (last) =>
      last.venues.length === 10
        ? { popularity: last.venues.at(-1)!.popularity, id: last.venues.at(-1)!.id }
        : undefined,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute for live count updates
  });
}