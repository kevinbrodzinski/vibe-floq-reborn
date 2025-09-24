import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useAfterglowByPlan(planId: string) {
  return useQuery({
    queryKey: ['plan-afterglow', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_afterglow')
        .select('*')
        .eq('plan_id', planId as any)
        .maybeSingle()

      if (error) {
        console.error('Error fetching plan afterglow:', error)
        throw error
      }

      return data
    },
    enabled: !!planId,
    refetchInterval: 30000, // Refetch every 30s for real-time afterglow submissions
  })
}