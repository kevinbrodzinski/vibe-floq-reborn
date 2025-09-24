import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import type { CommonVenue } from '@/types/discovery'

export function useCommonVenues(targetProfileId: string) {
  const session = useSession()
  const currentUserId = session?.user?.id
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.CommonVenues(currentUserId!, targetProfileId),
    queryFn: async (): Promise<CommonVenue[]> => {
      const { data, error } = await supabase.rpc('get_common_venues', {
        me_id: currentUserId!,
        target_id: targetProfileId
      })
      
      if (error) {
        console.error('Failed to fetch common venues:', error)
        throw error
      }
      
      return data as CommonVenue[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    select: (data) => [...data].sort((a, b) => b.overlap_visits - a.overlap_visits), // Sort by overlap
  })
}