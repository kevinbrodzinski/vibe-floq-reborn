import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import type { PlanSuggestion } from '@/types/discovery'

export function usePlanSuggestions(targetProfileId: string, options: { limit?: number } = {}) {
  const { limit = 3 } = options
  const session = useSession()
  const currentUserId = session?.user?.id
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.PlanSuggestions(currentUserId!, targetProfileId, limit),
    queryFn: async (): Promise<PlanSuggestion[]> => {
      const { data, error } = await supabase.rpc('get_plan_suggestions', {
        p_current_profile_id: currentUserId!,
        p_target_profile_id: targetProfileId,
        p_limit: limit
      })
      
      if (error) {
        console.error('Failed to fetch plan suggestions:', error)
        throw error
      }
      
      return data as PlanSuggestion[]
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}