import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { CrossStat } from '@/types/discovery'

export function useCrossedPathsStats(targetProfileId: string) {
  const session = useSession()
  
  return useQuery({
    enabled: !!session?.user && !!targetProfileId,
    queryKey: ['crossed-paths-stats', session?.user.id, targetProfileId],
    queryFn: async (): Promise<CrossStat> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      
      const mockStats: CrossStat = {
        countWeek: Math.floor(Math.random() * 5) + 1, // 1-5
        lastVenue: 'Blue Bottle Coffee',
        lastAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last week
        distance: Math.floor(Math.random() * 500) + 100, // 100-600 meters
      }
      
      return mockStats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}