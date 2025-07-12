
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchedUser {
  id: string;
  display_name: string;
  username: string;  // Now guaranteed to be non-null after our migration
  avatar_url: string | null;
  created_at: string;
}

export function useUserSearch(query: string, enabled = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
        return [];
      }

      if (import.meta.env.DEV) {
        console.time(`search_users_${debouncedQuery.trim()}`);
      }

      const { data, error } = await supabase.rpc('search_users', {
        search_query: debouncedQuery.trim()
      });

      if (import.meta.env.DEV) {
        console.timeEnd(`search_users_${debouncedQuery.trim()}`);
        console.log(`Found ${data?.length || 0} results for "${debouncedQuery.trim()}"`);
      }

      if (error) {
        if (import.meta.env.DEV) {
          console.error('User search error:', error);
        }
        throw error;
      }

      return (data || []) as SearchedUser[];
    },
    enabled: enabled && !!debouncedQuery.trim() && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });
}
