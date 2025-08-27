import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { mapPlanStopFromDb } from '@/types/mappers'
import type { Database } from '@/integrations/supabase/types'

type PlanStopRow = Database['public']['Tables']['plan_stops']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row'];
};

export function usePlanStops(plan_id: string) {
  return useQuery<any[]>({
    queryKey: ['plan-stops', plan_id],
    enabled: !!plan_id,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<any[]> => {
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

      if (error) throw error
      return (data ?? []).map(mapPlanStopFromDb)
    },
  })
}