import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePlanParticipants(plan_id: string) {
  return useQuery({
    queryKey: ['plan-participants', plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', plan_id)
      
      if (error) {
        console.error('Plan participants fetch error:', error)
        throw error
      }
      
      return data || []
    },
    enabled: !!plan_id,
  })
}