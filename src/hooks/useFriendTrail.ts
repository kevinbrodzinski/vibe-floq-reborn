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
      const { data, error } = await supabase.rpc('get_friend_trail', {
        friend_user_id: friendId,
        hours_back: 24,
        point_limit: 50
      });
      
      if (error) throw error;
      return (data || []) as TrailPoint[];
    },
    refetchInterval: 30_000, // every 30 seconds
    enabled: !!friendId
  });

  return data ?? [];
}