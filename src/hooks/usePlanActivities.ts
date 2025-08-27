import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePlanActivities(plan_id: string) {
  return useQuery({
    queryKey: ['plan-activities', plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_activities')
        .select(`
          *,
          user:profiles(display_name, username, avatar_url)
        `)
        .eq('plan_id', plan_id as any)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Plan activities fetch error:', error)
        throw error
      }
      
      return data || []
    },
    enabled: !!plan_id,
    refetchInterval: 30000, // Refetch every 30 seconds for live activity feed
  })
}