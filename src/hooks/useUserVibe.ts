import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserVibe {
  vibe: string;
  started_at: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export function useUserVibe(profileId: string | null) {
  return useQuery({
    queryKey: ['user-vibe', profileId],
    queryFn: async (): Promise<UserVibe | null> => {
      if (!profileId) return null;
      
      try {
        const { data, error } = await supabase
          .from('user_vibe_states')
          .select('vibe_tag, started_at, location')
          .eq('profile_id', profileId as any)
          .eq('active', true as any)
          .maybeSingle()
          .returns<any>();

        if (error) throw error;
        if (!data) return null;
        
        if ((data as any).location) {
          // Extract lat/lng from PostGIS geometry
          const coords = (data as any).location as any;
          if (coords?.coordinates) {
            return {
              vibe: (data as any).vibe_tag,
              started_at: (data as any).started_at,
              location: {
                lng: coords.coordinates[0],
                lat: coords.coordinates[1]
              }
            };
          }
        }
        
        return {
          vibe: (data as any).vibe_tag,
          started_at: (data as any).started_at
        };
      } catch (error) {
        console.error('Error fetching user vibe:', error);
        return null;
      }
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000, // 1 minute - vibe data changes frequently
  });
}