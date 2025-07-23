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
  check_ins: number;
}

/** fetches venues inside current map bounds */
export function useClusterVenues(bounds: [number, number, number, number] | null) {
  return useQuery({
    queryKey: ['cluster-venues', bounds?.map((n) => n.toFixed(3)).join(',')], // stable key
    enabled: !!bounds,
    staleTime: 30_000,
    queryFn: async () => {
      if (!bounds) return [];

      const [w, s, e, n] = bounds;
      const { data, error } = await supabase.rpc('get_cluster_venues', {
        min_lng: w,
        min_lat: s,
        max_lng: e,
        max_lat: n,
      });

      if (error) throw error;
      return data as ClusterVenue[];
    },
  });
}