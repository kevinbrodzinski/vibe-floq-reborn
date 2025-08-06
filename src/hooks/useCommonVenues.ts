import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { CommonVenue } from '@/types/discovery'

export function useCommonVenues(targetProfileId: string) {
  const session = useSession()
  
  return useQuery({
    enabled: !!session?.user && !!targetProfileId,
    queryKey: ['common-venues', session?.user.id, targetProfileId],
    queryFn: async (): Promise<CommonVenue[]> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      
      const mockVenues: CommonVenue[] = [
        {
          venue_id: 'venue-1',
          name: 'Blue Bottle Coffee',
          category: 'cafe',
          overlap_visits: 3,
        },
        {
          venue_id: 'venue-2', 
          name: 'Central Park',
          category: 'outdoor',
          overlap_visits: 2,
        },
        {
          venue_id: 'venue-3',
          name: 'The High Line',
          category: 'attraction',
          overlap_visits: 1,
        },
      ]
      
      return mockVenues
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}