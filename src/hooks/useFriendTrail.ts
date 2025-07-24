import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrailPoint {
  lat: number;
  lng: number;
  captured_at: string;
}

export function useFriendTrail(friendId: string) {
  const { data } = useQuery({
    queryKey: ['friend-trail', friendId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_last_points')
        .select('lat, lng, captured_at')
        .eq('user_id', friendId)
        .order('captured_at', { ascending: false });
      
      if (error) throw error;
      return data as TrailPoint[];
    },
    refetchInterval: 10_000, // every 10 seconds
    enabled: !!friendId
  });

  return data ?? [];
}