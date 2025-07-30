import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface FriendActivity {
  floq_id: string;
  joined_at: string;
  role: string;
  floq_title: string;
  primary_vibe: string;
  friend_id: string; // Keep as friend_id since this comes from unified view
  friend_username: string;
  friend_display_name: string;
  friend_avatar_url: string;
}

export function useFriendActivity(since?: string, limit = 40) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-activity', user?.id, since, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const params: any = {
        _limit: limit
      };
      
      if (since) {
        params._since = since;
      }

      const { data, error } = await supabase.rpc('get_friend_feed', params);

      if (error) throw error;
      return (data || []) as FriendActivity[];
    },
  });
}