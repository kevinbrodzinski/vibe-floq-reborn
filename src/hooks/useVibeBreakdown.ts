import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import { simpleHash } from '@/lib/utils/hash'
import type { VibeBreakdown } from '@/types/discovery'

export function useVibeBreakdown(targetProfileId: string) {
  const session = useSession()
  const currentUserId = session?.user?.id
  
  // Generate stable mock data to avoid SSR hydration mismatches
  const mockData = useMemo((): VibeBreakdown => {
    if (typeof window === 'undefined') {
      return {
        overall: 75,
        venueDNA: 68,
        timeRhythm: 82,
        socialPattern: 71,
      }
    }
    
    // Use better hash for consistent mock data distribution
    const hash = simpleHash(targetProfileId + (currentUserId || ''))
    return {
      overall: Math.round((hash % 40) + 60), // 60-100
      venueDNA: Math.round(((hash >> 8) % 30) + 50), // 50-80
      timeRhythm: Math.round(((hash >> 16) % 25) + 65), // 65-90
      socialPattern: Math.round(((hash >> 24) % 35) + 45), // 45-80
    }
  }, [targetProfileId, currentUserId])
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.VibeBreakdown(currentUserId!, targetProfileId),
    queryFn: async (): Promise<VibeBreakdown> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      return mockData
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}