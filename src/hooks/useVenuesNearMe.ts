import { useInfiniteQuery } from '@tanstack/react-query';
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

export function useVenuesNearMe(lat?: number, lng?: number, radius_km: number = 0.5) {
  return useInfiniteQuery({
    queryKey: ['venues-near-me', lat, lng, radius_km],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async ({ pageParam = 0 }) => {
      // Use get_cluster_venues for enhanced venue data
      const degreeOffset = radius_km / 111; // rough conversion
      const { data, error } = await supabase.rpc('get_cluster_venues', {
        min_lng: lng! - degreeOffset,
        min_lat: lat! - degreeOffset,
        max_lng: lng! + degreeOffset,
        max_lat: lat! + degreeOffset,
        cursor_popularity: pageParam ?? 0,
        limit_rows: 10,
      } as any);
      
      if (error) throw error;
      
      // Transform data to match VenueNearMe interface
      const venues = (data || []).map(venue => ({
        id: venue.id,
        name: venue.name,
        lat: venue.lat,
        lng: venue.lng,
        vibe: 'social', // default vibe
        source: 'database',
        distance_m: 0, // would need geospatial calculation
        live_count: venue.live_count,
        vibe_score: venue.vibe_score,
        popularity: venue.check_ins // map check_ins to popularity
      }));
      
      // Key-set pagination using popularity (check_ins)
      const nextCursor = venues.length
        ? venues[venues.length - 1].popularity   // smallest pop on this page
        : undefined;
      
      return {
        venues,
        nextCursor,
        hasMore: venues.length === 10 // If we got full page, there might be more
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute for live count updates
  });
}