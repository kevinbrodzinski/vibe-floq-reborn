import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { VibeBreakdown } from '@/types/discovery'

export function useVibeBreakdown(targetProfileId: string) {
  const session = useSession()
  
  return useQuery({
    enabled: !!session?.user && !!targetProfileId,
    queryKey: ['vibe-breakdown', session?.user.id, targetProfileId],
    queryFn: async (): Promise<VibeBreakdown> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      
      const mockBreakdown: VibeBreakdown = {
        overall: Math.round(Math.random() * 40 + 60), // 60-100
        venueDNA: Math.round(Math.random() * 30 + 50), // 50-80
        timeRhythm: Math.round(Math.random() * 25 + 65), // 65-90
        socialPattern: Math.round(Math.random() * 35 + 45), // 45-80
      }
      
      return mockBreakdown
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}