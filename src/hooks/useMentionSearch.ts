import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/hooks/useProfileCache';

export function useMentionSearch(query: string, enabled = true) {
  const result = useQuery({
    queryKey: ['mention-search', query],
    enabled: enabled && query.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev ?? [],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .rpc('search_users', { p_query: query, p_limit: 10 });
      
      if (error) throw error;
      
      // Transform the search results to match our Profile interface
      return (data ?? []).map((user: any) => ({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      }));
    },
  });

  // Cleanup any pending debounced queries on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending query if needed
    };
  }, []);

  return result;
}