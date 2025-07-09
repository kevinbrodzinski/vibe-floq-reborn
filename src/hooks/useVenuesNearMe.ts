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
}

export function useVenuesNearMe(lat?: number, lng?: number, radius_km: number = 0.5) {
  return useInfiniteQuery({
    queryKey: ['venues-near-me', lat, lng, radius_km],
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    queryFn: async ({ pageParam = 0 }) => {
      // Use get_venues_in_bbox for now until venues_near_me is available
      const degreeOffset = radius_km / 111; // rough conversion
      const { data, error } = await supabase.rpc('get_venues_in_bbox', {
        west: lng! - degreeOffset,
        south: lat! - degreeOffset,
        east: lng! + degreeOffset,
        north: lat! + degreeOffset,
      });
      
      if (error) throw error;
      
      // Simulate pagination for infinite scroll
      const pageSize = 10;
      const start = pageParam * pageSize;
      const end = start + pageSize;
      const venues = (data as VenueNearMe[]).slice(start, end);
      
      return {
        venues,
        nextCursor: venues.length === pageSize ? pageParam + 1 : undefined,
        hasMore: end < (data as VenueNearMe[]).length
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute for live count updates
  });
}