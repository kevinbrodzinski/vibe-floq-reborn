import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/EnhancedAuthProvider'

type ReqStatus = 'none' | 'pending_out' | 'pending_in' | 'friends'

export interface DiscoverUser {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  created_at: string
  req_status: ReqStatus
}

export function useFriendDiscovery(query: string) {
  const { user } = useAuth()
  const key = ['discover', user?.id ?? 'anon', query.trim()]

  return useQuery<DiscoverUser[]>({
    queryKey: key,
    enabled: !!query.trim() && query.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('search_profiles_with_status', { p_query: query, p_limit: 20 })

      if (error) throw error
      return data as DiscoverUser[]
    },
    staleTime: 30_000,
  })
}