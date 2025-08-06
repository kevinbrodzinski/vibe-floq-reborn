import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import type { CrossStat } from '@/types/discovery'

export function useCrossedPathsStats(targetProfileId: string) {
  const session = useSession()
  const currentUserId = session?.user?.id
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.CrossedPathsStats(currentUserId!, targetProfileId),
    queryFn: async (): Promise<CrossStat> => {
      const { data, error } = await supabase.rpc('get_crossed_paths_stats', {
        me_id: currentUserId!,
        target_id: targetProfileId
      })
      
      if (error) {
        console.error('Failed to fetch crossed paths stats:', error)
        throw error
      }
      
      return {
        countWeek: data[0].countweek,
        lastVenue: data[0].lastvenue,
        lastAt: data[0].lastat,
        distance: data[0].distance
      } as CrossStat
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}