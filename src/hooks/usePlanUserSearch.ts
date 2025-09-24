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
      // Get existing plan participants first
      const { data: participants, error: participantsError } = await supabase
        .from('plan_participants')
        .select('profile_id')
        .eq('plan_id', planId as any)
        .returns<any>()

      if (participantsError) throw participantsError

      const existingUserIds = (participants as any)?.map((p: any) => p.profile_id).filter(Boolean) || []

      // Search users excluding existing participants
      let searchQuery = supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10)

      // Exclude existing participants if any exist
      if (existingUserIds.length > 0) {
        searchQuery = searchQuery.not('id', 'in', `(${existingUserIds.map(id => `'${id}'`).join(',')})`)
      }

      const { data, error } = await searchQuery.returns<any>()

      if (error) throw error
      return (data as any) || []
    },
    staleTime: 60_000,
  })
}