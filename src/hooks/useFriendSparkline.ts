import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFriendSparkline(friendId: string): [number, number][] | undefined {
  const { data } = useQuery<[number, number][]>({
    queryKey: ['spark', 'v_friend_sparkline', 'v1', friendId], // Include table version for cache invalidation
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_friend_sparkline')
        .select('points')
        .eq('profile_id', friendId)
        .maybeSingle();
      if (error) throw error;
      return (data?.points ?? []) as [number, number][];
    },
    refetchInterval: 300_000, // 5 min
    staleTime: 240_000, // 4 min - prevents flash during background fetches
  });
  return data;
}