
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';

export interface FloqRow {
  id: string;
  title: string;
  name: string | null;
  primary_vibe: string;
  vibe_tag: string;
  type: string;
  starts_at: string;
  ends_at: string;
  participant_count: number;
  boost_count: number; // Added boost count
  starts_in_min: number;
  distance_meters: number | null; // Added distance
  members: {
    avatar_url: string | null;
    id: string;
    username: string | null;
    display_name: string | null;
  }[];
}

interface UseActiveFloqsOptions {
  limit?: number;
  offset?: number;
  includeDistance?: boolean;
}

export const useActiveFloqs = (options: UseActiveFloqsOptions = {}) => {
  const { limit = 20, offset = 0, includeDistance = true } = options;
  const { lat, lng } = useGeolocation();

  // Round coordinates for better cache key stability
  const roundedLat = lat ? Math.round(lat * 1000) / 1000 : null;
  const roundedLng = lng ? Math.round(lng * 1000) / 1000 : null;

  return useQuery<FloqRow[]>({
    queryKey: ['active-floqs', limit, offset, roundedLat, roundedLng, includeDistance],
    staleTime: 10_000,
    queryFn: async () => {
      // Use the updated RPC with boost count and distance sorting
      const { data, error } = await supabase.rpc('get_active_floqs_with_members', {
        p_limit: limit,
        p_offset: offset,
        p_user_lat: includeDistance && lat ? lat : null,
        p_user_lng: includeDistance && lng ? lng : null
      });
      
      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((floq: any) => ({
        ...floq,
        vibe_tag: floq.primary_vibe, // Map primary_vibe to vibe_tag for consistency
        members: Array.isArray(floq.members) ? floq.members : [],
        boost_count: floq.boost_count || 0,
        distance_meters: floq.distance_meters
      }));
    },
    // Only enable if we have basic requirements
    enabled: includeDistance ? !!(lat && lng) : true,
  });
};
