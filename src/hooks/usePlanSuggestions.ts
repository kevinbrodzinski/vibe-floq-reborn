import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { PlanSuggestion } from '@/types/discovery'

export function usePlanSuggestions(targetProfileId: string, limit = 3) {
  const session = useSession()
  
  return useQuery({
    enabled: !!session?.user && !!targetProfileId,
    queryKey: ['plan-suggestions', session?.user.id, targetProfileId, limit],
    queryFn: async (): Promise<PlanSuggestion[]> => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      
      const suggestions = [
        { id: 'sug-1', title: 'Grab coffee and catch up', vibe: 'social', venue_type: 'cafe', estimated_duration: '45-60 minutes' },
        { id: 'sug-2', title: 'Walk through the park', vibe: 'chill', venue_type: 'outdoor', estimated_duration: '30-45 minutes' },
        { id: 'sug-3', title: 'Try that new restaurant', vibe: 'social', venue_type: 'restaurant', estimated_duration: '60-90 minutes' },
        { id: 'sug-4', title: 'Hit up a local market', vibe: 'energetic', venue_type: 'market', estimated_duration: '60 minutes' },
        { id: 'sug-5', title: 'Check out live music', vibe: 'excited', venue_type: 'venue', estimated_duration: '90-120 minutes' },
      ]
      
      return suggestions.slice(0, limit)
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}