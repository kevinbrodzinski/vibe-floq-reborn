import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface UserSearchResult {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

export function usePlanUserSearch(planId: string, query: string) {
  return useQuery({
    queryKey: ['plan-user-search', planId, query],
    enabled: query.length >= 2,
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .not('id', 'in', `(
          SELECT user_id FROM plan_participants 
          WHERE plan_id = '${planId}' AND user_id IS NOT NULL
        )`)
        .limit(10)

      if (error) throw error
      return data || []
    },
    staleTime: 60_000,
  })
}