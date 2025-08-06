import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
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
    
    // Use targetProfileId to determine which venues to show
    const seed = targetProfileId.charCodeAt(0) % venues.length
    return venues.slice(0, Math.max(2, seed % 4 + 1))
  }, [targetProfileId])
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: ['common-venues', currentUserId, targetProfileId],
    queryFn: async (): Promise<CommonVenue[]> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      return mockData
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}