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

export function useClusterVenues(bbox: [number, number, number, number] | null) {
  return useQuery({
    queryKey: ['cluster-venues', bbox],
    enabled: !!bbox,
    queryFn: async () => {
      if (!bbox) return [];
      const [w, s, e, n] = bbox;
      const { data, error } = await supabase.rpc('get_cluster_venues', {
        min_lng: w, 
        min_lat: s, 
        max_lng: e, 
        max_lat: n
      });
      if (error) throw error;
      return data as ClusterVenue[];
    },
    staleTime: 30_000
  });
}