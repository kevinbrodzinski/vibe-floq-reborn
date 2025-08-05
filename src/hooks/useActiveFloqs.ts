import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';

export const useActiveFloqs = () => {
  const { coords } = useGeo();

  return useInfiniteQuery({
    queryKey: ['active-floqs', coords?.lat, coords?.lng],
    enabled : !!coords,
    initialPageParam: 0,
    getNextPageParam: (lastPage: { data: any[], nextCursor: number | null }) => lastPage.nextCursor,
    queryFn : async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc(
        'get_visible_floqs_with_members',
        {
          p_lat: coords!.lat,
          p_lng: coords!.lng,
          p_limit: 20,
          p_offset: pageParam,
        },
      );
      if (error) throw error;
      return {
        data: data || [],
        nextCursor: (data && data.length < 20) ? null : (pageParam as number) + 20,
      };
    },
    staleTime: 30 * 1000,
  });
};