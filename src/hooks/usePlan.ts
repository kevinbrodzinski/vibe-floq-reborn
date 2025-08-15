import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type Plan = Database['public']['Tables']['floq_plans']['Row']

export function usePlan(planId: string) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      if (!planId) throw new Error('Plan ID is required')
      
      const { data, error } = await supabase
        .from('floq_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (error) {
        console.error('Plan fetch error:', error)
        throw error
      }

      return data as Plan
    },
    enabled: !!planId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}