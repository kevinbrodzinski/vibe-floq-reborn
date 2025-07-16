import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePlanStops(plan_id: string) {
  return useQuery({
    queryKey: ['plan-stops', plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_stops')
        .select(`
          *,
          venue:venues(*)
        `)
        .eq('plan_id', plan_id)
        .order('start_time', { ascending: true })
      
      if (error) {
        console.error('Plan stops fetch error:', error)
        throw error
      }
      
      return data || []
    },
    enabled: !!plan_id,
  })
}