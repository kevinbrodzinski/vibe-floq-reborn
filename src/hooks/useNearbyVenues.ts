import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NearbyVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vibe: string;
  source: string;
}

export function useNearbyVenues(lat?: number, lng?: number, km: number = 0.3) {
  return useQuery({
    queryKey: ['nearby-venues', lat, lng, km],
    enabled: lat != null && lng != null,
    queryFn: async () => {
      // Convert km to degree approximation for bbox
      const degreeOffset = km / 111; // rough conversion
      
      const { data, error } = await supabase.rpc('get_venues_in_bbox', {
        west: lng! - degreeOffset,
        south: lat! - degreeOffset,
        east: lng! + degreeOffset,
        north: lat! + degreeOffset,
      });
      
      if (error) throw error;
      return data as NearbyVenue[];
    },
    staleTime: 30_000, // 30 seconds
  });
}