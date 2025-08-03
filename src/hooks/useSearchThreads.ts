import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface ThreadSearchResult {
  thread_id: string;
  friend_profile_id: string;
  friend_display_name: string;
  friend_username: string;
  friend_avatar_url: string;
  last_message_at: string;
  my_unread_count: number;
}

export const useSearchThreads = (query: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dm-thread-search', user?.id, query],
    enabled: !!query && query.trim().length >= 2,
    queryFn: async (): Promise<ThreadSearchResult[]> => {
      const { data, error } = await supabase.functions.invoke('search-threads', {
        body: { q: query.trim() }
      });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000, // 1 minute
  });
};