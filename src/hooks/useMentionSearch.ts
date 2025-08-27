import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export type MentionSearchRow = {
  kind: 'user'|'venue'|'floq'
  id: string
  label: string
  handle?: string
  username?: string
  display_name?: string
  full_name?: string
  avatar_url?: string
}

export function useMentionSearch(q: string) {
  const enabled = q.trim().length > 0
  return useQuery<MentionSearchRow[]>({
    queryKey: ['mentions:search', q],
    enabled,
    queryFn: async () => {
      // Fallback search across profiles directly since RPC may not exist
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .ilike('username', `%${q}%`)
        .limit(10)
        .returns<Array<{id: string; username: string; display_name: string}>>()
      
      if (error) throw error
      
      return (users ?? []).map(user => ({
        kind: 'user' as const,
        id: user.id,
        label: user.display_name || user.username,
        handle: user.username,
        username: user.username,
        display_name: user.display_name,
        full_name: user.display_name,
        avatar_url: null,
      }))
    },
  })
}