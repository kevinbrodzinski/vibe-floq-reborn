import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Type definition for search_profiles function
export interface SearchProfilesFunction {
  Args: {
    p_query: string
    p_limit?: number | null
  }
  Returns: {
    id: string
    display_name: string
    username: string
    avatar_url: string | null
    created_at: string
  }[]
}

export type SearchedUser = SearchProfilesFunction['Returns'][number]

export function useUserSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['user-search', query],
    enabled: enabled && query.length >= 2,
    queryFn: async (): Promise<SearchedUser[]> => {
      const { data, error } = await supabase.rpc('search_profiles', {
        p_query: query,
        p_limit: 10
      })

      if (error) throw error
      if (!data) return []
      
      return data.map(profile => ({
        ...profile,
        created_at: new Date().toISOString() // Default value since search_profiles doesn't return created_at
      }))
    },
    staleTime: 60_000,
  })
}