import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

export const useFriendSparkline = (friendId: string | null) => {
  const currentProfileId = useCurrentUserId();
  
  return useQuery({
    queryKey: ['friend-sparkline', currentProfileId, friendId],
    enabled: !!friendId && !!currentProfileId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!friendId || !currentProfileId) return [];
      
      const { data, error } = await supabase
        .from('v_friend_sparkline')
        .select('*')
        .eq('current_profile_id', currentProfileId)
        .eq('other_profile_id', friendId)
        .order('day', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
};