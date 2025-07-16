import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePlanVotes(plan_id: string) {
  return useQuery({
    queryKey: ['plan-votes', plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_votes')
        .select(`
          *,
          stop:plan_stops(title),
          user:profiles(display_name, username, avatar_url)
        `)
        .eq('plan_id', plan_id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Plan votes fetch error:', error)
        throw error
      }
      
      return data || []
    },
    enabled: !!plan_id,
  })
}