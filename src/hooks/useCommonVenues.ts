import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import { simpleHash } from '@/lib/utils/hash'
import type { CommonVenue } from '@/types/discovery'

export function useCommonVenues(targetProfileId: string) {
  const session = useSession()
  const currentUserId = session?.user?.id
  
  // Generate stable mock data to avoid SSR hydration mismatches
  const mockData = useMemo((): CommonVenue[] => {
    const venues = [
      { venue_id: 'venue-1', name: 'Blue Bottle Coffee', category: 'cafe', overlap_visits: 3 },
      { venue_id: 'venue-2', name: 'Central Park', category: 'outdoor', overlap_visits: 2 },
      { venue_id: 'venue-3', name: 'The High Line', category: 'attraction', overlap_visits: 1 },
      { venue_id: 'venue-4', name: 'Whitney Museum', category: 'gallery', overlap_visits: 2 },
      { venue_id: 'venue-5', name: 'Brooklyn Bridge', category: 'attraction', overlap_visits: 1 },
    ]
    
    // Use better hash to determine which venues to show
    const hash = simpleHash(targetProfileId + (currentUserId || ''))
    const count = Math.max(2, (hash % 4) + 1)
    const start = hash % Math.max(1, venues.length - count)
    
    return venues.slice(start, start + count)
  }, [targetProfileId, currentUserId])
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.CommonVenues(currentUserId!, targetProfileId),
    queryFn: (): Promise<CommonVenue[]> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      return Promise.resolve(mockData)
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    select: (data) => data.sort((a, b) => b.overlap_visits - a.overlap_visits), // Sort by overlap
  })
}