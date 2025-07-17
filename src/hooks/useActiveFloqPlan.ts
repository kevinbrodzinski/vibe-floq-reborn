import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type Plan = Database['public']['Tables']['floq_plans']['Row']

export function useActiveFloqPlan(floqId?: string) {
  return useQuery({
    enabled: !!floqId,
    queryKey: ['active-floq-plan', floqId],
    queryFn: async (): Promise<Plan | null> => {
      const { data, error } = await supabase
        .from('floq_plans')
        .select('*')
        .eq('floq_id', floqId!)
        .eq('status', 'draft') // assuming active plans are in draft status
        .maybeSingle()

      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}