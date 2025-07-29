import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { mapPlanStopFromDb } from '@/types/mappers'
import type { Database } from '@/integrations/supabase/types'

type PlanStopRow = Database['public']['Tables']['plan_stops']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row'];
};

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
        .order('stop_order', { ascending: true, nullsFirst: false })
        .order('start_time', { ascending: true })
        .returns<PlanStopRow[]>()
      
      if (error) {
        console.error('Plan stops fetch error:', error)
        throw error
      }
      
      return (data || []).map(mapPlanStopFromDb)
    },
    enabled: !!plan_id,
    staleTime: 15000, // 15 seconds
    refetchOnWindowFocus: false,
  })
}