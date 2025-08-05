import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalSearchResult {
  kind: string;
  id: string;
  label: string;
  sublabel: string;
  similarity: number;
  distance_m: number;
  starts_at: string;
}

export interface GroupedSearchResults {
  users: GlobalSearchResult[];
  venues: GlobalSearchResult[];
  floqs: GlobalSearchResult[];
  events: GlobalSearchResult[];
}

export function useGlobalSearch(query: string, enabled = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the query - slightly faster than user search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
        return { users: [], venues: [], floqs: [], events: [] };
      }

      const { data, error } = await supabase.rpc('search_everything', {
        query: debouncedQuery.trim()
      });

      if (error) {
        console.error('Global search error:', error);
        throw error;
      }

      const results = (data || []) as GlobalSearchResult[];
      
      // Group results by kind
      const grouped: GroupedSearchResults = {
        users: results.filter(r => r.kind === 'user'),
        venues: results.filter(r => r.kind === 'venue'),
        floqs: results.filter(r => r.kind === 'floq'),
        events: results.filter(r => r.kind === 'event')
      };

      return grouped;
    },
    enabled: enabled && !!debouncedQuery.trim() && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });
}