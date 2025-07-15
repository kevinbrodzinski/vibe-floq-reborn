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

export function useUserVibe(userId: string | null) {
  return useQuery({
    queryKey: ['user-vibe', userId],
    queryFn: async (): Promise<UserVibe | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('vibes_now')
        .select('vibe, started_at, location')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.location) {
        // Extract lat/lng from PostGIS geometry
        const coords = data.location as any;
        if (coords?.coordinates) {
          return {
            ...data,
            location: {
              lng: coords.coordinates[0],
              lat: coords.coordinates[1]
            }
          };
        }
      }
      
      return data;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - vibe data changes frequently
  });
}