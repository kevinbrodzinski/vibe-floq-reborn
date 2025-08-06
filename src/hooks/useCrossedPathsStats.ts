import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import { simpleHash } from '@/lib/utils/hash'
import type { CrossStat } from '@/types/discovery'

export function useCrossedPathsStats(targetProfileId: string) {
  const session = useSession()
  const currentUserId = session?.user?.id
  
  // Generate stable hash for consistent mock data
  const hash = useMemo(
    () => simpleHash(targetProfileId + (currentUserId || '')),
    [targetProfileId, currentUserId]
  )

  // Generate stable mock data to avoid SSR hydration mismatches
  const mockData = useMemo((): CrossStat => {
    if (typeof window === 'undefined') {
      return {
        countWeek: 2,
        lastVenue: 'Blue Bottle Coffee',
        lastAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        distance: 250,
      }
    }
    
    const venues = ['Blue Bottle Coffee', 'Central Park', 'Whitney Museum', 'Brooklyn Bridge', 'The High Line']
    
    return {
      countWeek: Math.max(1, (hash % 5) + 1), // 1-5
      lastVenue: venues[hash % venues.length],
      lastAt: new Date(Date.now() - ((hash >> 8) % 7) * 24 * 60 * 60 * 1000).toISOString(),
      distance: Math.max(100, ((hash >> 16) % 500) + 100), // 100-600 meters
    }
  }, [hash])
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.CrossedPathsStats(currentUserId!, targetProfileId),
    queryFn: (): CrossStat => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      return mockData
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}