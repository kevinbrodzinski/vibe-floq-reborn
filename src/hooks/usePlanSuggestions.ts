import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/constants/queryKeys'
import { simpleHash } from '@/lib/utils/hash'
import type { PlanSuggestion } from '@/types/discovery'

export function usePlanSuggestions(targetProfileId: string, options: { limit?: number } = {}) {
  const { limit = 3 } = options
  const session = useSession()
  const currentUserId = session?.user?.id
  
  // Generate stable hash for consistent mock data
  const hash = useMemo(
    () => simpleHash(targetProfileId + (currentUserId || '') + limit.toString()),
    [targetProfileId, currentUserId, limit]
  )

  // Generate stable mock data to avoid SSR hydration mismatches
  const mockData = useMemo((): PlanSuggestion[] => {
    const suggestions = [
      { id: 'sug-1', title: 'Grab coffee and catch up', vibe: 'social', venue_type: 'cafe', estimated_duration: '45-60 minutes' },
      { id: 'sug-2', title: 'Walk through the park', vibe: 'chill', venue_type: 'outdoor', estimated_duration: '30-45 minutes' },
      { id: 'sug-3', title: 'Try that new restaurant', vibe: 'social', venue_type: 'restaurant', estimated_duration: '60-90 minutes' },
      { id: 'sug-4', title: 'Hit up a local market', vibe: 'energetic', venue_type: 'market', estimated_duration: '60 minutes' },
      { id: 'sug-5', title: 'Check out live music', vibe: 'excited', venue_type: 'venue', estimated_duration: '90-120 minutes' },
      { id: 'sug-6', title: 'Visit a gallery opening', vibe: 'cultural', venue_type: 'gallery', estimated_duration: '90 minutes' },
    ]
    
    const start = hash % Math.max(1, suggestions.length - limit)
    
    return suggestions.slice(start, start + limit)
  }, [hash])
  
  return useQuery({
    enabled: !!currentUserId && !!targetProfileId,
    queryKey: QK.PlanSuggestions(currentUserId!, targetProfileId, limit),
    queryFn: (): PlanSuggestion[] => {
      // For now, return mock data since the RPC functions need the venue_visits table schema fixed
      // TODO: Replace with actual RPC call once database migration is complete
      return mockData
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}