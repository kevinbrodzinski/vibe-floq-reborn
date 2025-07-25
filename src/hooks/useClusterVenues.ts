import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClusterVenue {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  vibe_score: number;
  live_count: number;
  popularity: number;   // popularity snapshot for pagination
}

/** fetches venues inside current map bounds */
export function useClusterVenues(bounds: [number, number, number, number] | null) {
  return useQuery({
    queryKey: ['cluster-venues', { bounds: bounds?.map((n) => n.toFixed(3)) }], // stable object key
    enabled: !!bounds,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!bounds) return [];

      const [w, s, e, n] = bounds;
      const { data, error } = await supabase.rpc('get_cluster_venues', {
        min_lng: w,
        min_lat: s,
        max_lng: e,
        max_lat: n,
        cursor_popularity: 0,
        limit_rows: 10,
      } as any);

      if (error) {
        console.error('Failed to fetch cluster venues:', error);
        throw error;
      }

      // Transform lat/lng to numbers and return properly typed data
      return (data || []).map(venue => ({
        ...venue,
        lat: +venue.lat, // Safe casting for both string and number types
        lng: +venue.lng,
        popularity: (venue as any).popularity || (venue as any).check_ins || 0,
      }));
    },
  });
}