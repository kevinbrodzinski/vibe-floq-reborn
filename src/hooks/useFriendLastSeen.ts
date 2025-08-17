import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

export function useFriendLastSeen() {
  const currentProfileId = useCurrentUserId();
  
  return useQuery({
    queryKey: ['friend-last-seen', currentProfileId],
    enabled: !!currentProfileId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      if (!currentProfileId) return [];
      
      const { data, error } = await supabase
        .from('v_friend_last_seen')
        .select('*')
        .eq('current_profile_id', currentProfileId);
      
      if (error) throw error;
      return data || [];
    },
  });
}

export async function getFriendLastSeen(current_profile_id: string) {
  const sb = supabase;
  const { data, error } = await sb
    .from('v_friend_last_seen')
    .select('*')
    .eq('current_profile_id', current_profile_id);
  if (error) throw error;
  return data;
}