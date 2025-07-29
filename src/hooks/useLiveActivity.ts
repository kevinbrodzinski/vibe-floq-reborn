import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';

export const useLiveActivity = () => {
  const { coords } = useGeo();

  return useInfiniteQuery({
    queryKey: ['live_activity', coords?.latitude, coords?.longitude],
    enabled : !!coords,
    initialPageParam: 0,
    getNextPageParam: () => null, // No pagination needed
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_live_activity' as any, {
        p_radius_km:  5,
        p_lat      :  coords!.latitude,
        p_lng      :  coords!.longitude,
      });
      if (error) throw error;
      return { data: data || [], nextCursor: null };   // RPC already returns full set
    },
    staleTime: 30 * 1000,
  });
};