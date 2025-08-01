import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface SearchedUser {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  created_at: string
}

export function useUserSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['user-search', query],
    enabled: enabled && query.length >= 2,
    queryFn: async (): Promise<SearchedUser[]> => {
      // Use new search_profiles RPC function for better search results
      const { data, error } = await supabase.rpc('search_profiles', {
        p_query: query,
        p_limit: 10
      })

      if (error) throw error
      return data || []
    },
    staleTime: 60_000,
  })
}