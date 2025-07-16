import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePlanComments(plan_id: string, stop_id?: string) {
  return useQuery({
    queryKey: ['plan-comments', plan_id, stop_id],
    queryFn: async () => {
      let query = supabase
        .from('plan_comments')
        .select(`
          *,
          user:profiles(display_name, username, avatar_url),
          reply_to:plan_comments(
            id,
            content,
            user:profiles(display_name, username)
          )
        `)
        .eq('plan_id', plan_id)
        .order('created_at', { ascending: true })
      
      if (stop_id) {
        query = query.eq('stop_id', stop_id)
      } else {
        query = query.is('stop_id', null) // General plan comments
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Plan comments fetch error:', error)
        throw error
      }
      
      return data || []
    },
    enabled: !!plan_id,
  })
}