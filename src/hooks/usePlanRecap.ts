import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface PlanSuggestion {
  title: string
  body: string
  emoji: string
}

export interface PlanRecapData {
  plan_id: string
  summary_md: string | null
  suggestions: PlanSuggestion[]
  status: 'pending' | 'ready' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

export function usePlanRecap(planId: string) {
  return useQuery({
    queryKey: ['plan-recap', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_ai_summaries')
        .select('*')
        .eq('plan_id', planId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data ? {
        ...data,
        suggestions: Array.isArray(data.suggestions) ? data.suggestions as unknown as PlanSuggestion[] : []
      } as PlanRecapData : null
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!planId
  })
}