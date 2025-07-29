import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFriendSparkline = (friendId: string | null) => {
  return useQuery({
    queryKey: ['friend-sparkline', friendId],
    enabled: !!friendId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_friend_sparkline')
        .select('day, checkins')
        .eq('friend_id', friendId)
        .order('day');
      if (error) throw error;
      // map to [timestamp, count][]
      return data.map(row => [new Date(row.day).valueOf(), row.checkins] as [number, number]);
    },
  });
};