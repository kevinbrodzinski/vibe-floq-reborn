import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DiscoverProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  req_status: 'none' | 'pending' | 'accepted' | 'blocked';
};

export function useFriendDiscovery(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['discover', query],
    enabled: enabled && query.length >= 2,
    queryFn: async (): Promise<DiscoverProfile[]> => {
      const { data, error } = await supabase
        .rpc('search_profiles', {
          p_query: query,
          p_limit: 10
        });

      if (error) throw error;
      
      // For now, add a default req_status since the RPC doesn't include it yet
      // TODO: Replace with v_discover_profiles view once it's available
      return (data || []).map((user: any) => ({
        ...user,
        req_status: 'none' as const
      }));
    },
    staleTime: 30_000,
  });
}