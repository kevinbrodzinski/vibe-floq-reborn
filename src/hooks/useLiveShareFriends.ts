import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** UUIDs of people the current user is live-sharing with */
export function useLiveShareFriends() {
  const { data, error } = useQuery({
    queryKey: ['live-share-friends'],
    queryFn: async () => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[useLiveShareFriends] No authenticated user');
        return [];
      }

      const { data, error } = await supabase
        .from('friend_share_pref')
        .select('other_profile_id')
        .eq('profile_id', user.id)
        .eq('is_live', true);

      if (error) {
        console.error('[useLiveShareFriends] Query error:', error);
        throw error;
      }

      const friendIds = data.map(row => row.other_profile_id) as string[];
      console.log('[useLiveShareFriends] Found friends sharing with me:', friendIds);
      return friendIds;
    },
    staleTime: 60_000,
    retry: false,
  });

  if (error) {
    console.warn('useLiveShareFriends error:', error);
    return [];
  }

  return data ?? [];
}