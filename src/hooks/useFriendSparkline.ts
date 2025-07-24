import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFriendSparkline(friendId: string): [number, number][] | undefined {
  const { data } = useQuery<[number, number][]>({
    queryKey: ['spark', friendId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_friend_sparkline')
        .select('points')
        .eq('user_id', friendId)
        .maybeSingle();
      if (error) throw error;
      return (data?.points ?? []) as [number, number][];
    },
    refetchInterval: 300_000, // 5 min
  });
  return data;
}