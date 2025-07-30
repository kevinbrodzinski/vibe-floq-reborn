import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** UUIDs of people the current user is live-sharing with */
export function useLiveShareFriends() {
  const { data, error } = useQuery({
    queryKey: ['live-share-friends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_share_pref')
        // ⬇️ new column name
        .select('other_profile_id')
        .eq('is_live', true);

      if (error) throw error;
      return data.map(row => row.other_profile_id) as string[];
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