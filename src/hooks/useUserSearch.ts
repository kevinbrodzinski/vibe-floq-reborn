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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, created_at')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      return data || []
    },
    staleTime: 60_000,
  })
}