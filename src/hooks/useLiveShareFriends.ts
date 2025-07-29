import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** List of friend_ids the current user allowed to see his live location */
export function useLiveShareFriends() {
  const { data, error } = useQuery({
    queryKey: ['live-share-friends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_share_pref')
        .select('friend_id')
        .eq('is_live', true);

      if (error) throw error;
      return data.map(row => row.friend_id) as string[];
    },
    staleTime: 60_000,
    retry: false, // Don't retry if QueryClient isn't ready
    enabled: true, // Always try to run, but gracefully handle failures
  });

  // If there's an error (like QueryClient not ready), return empty array
  if (error) {
    console.warn('useLiveShareFriends error:', error);
    return [];
  }

  return data ?? [];
} 