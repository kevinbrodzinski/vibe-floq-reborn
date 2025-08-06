import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import type { VibeBreakdown } from '@/types/discovery'

export function useVibeBreakdown(targetProfileId: string) {
  const session = useSession()
  const currentUserId = session?.user?.id
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.VibeBreakdown(currentUserId!, targetProfileId),
    queryFn: async (): Promise<VibeBreakdown> => {
      const { data, error } = await supabase.rpc('get_vibe_breakdown', {
        p_current_profile_id: currentUserId!,
        p_target_profile_id: targetProfileId
      })
      
      if (error) {
        console.error('Failed to fetch vibe breakdown:', error)
        throw error
      }
      
      return data as VibeBreakdown
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}