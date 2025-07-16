import { getSmartTimeSuggestion, SmartTimeSuggestionInput } from '@/lib/nova/getSmartTimeSuggestion'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useMemo } from 'react'
import type { PlanStop } from '@/types/plan'

interface UseSmartTimeSuggestionProps {
  planStartTime: string
  planEndTime: string
  existingStops: PlanStop[]
  venueMetadata?: {
    open_hours?: string[]
    ideal_times?: string[]
    type?: string
  }
}

export function useSmartTimeSuggestion({
  planStartTime,
  planEndTime,
  existingStops,
  venueMetadata,
}: UseSmartTimeSuggestionProps) {
  const { data: userPreferences } = useUserPreferences()
  
  return useMemo(() => {
    const input: SmartTimeSuggestionInput = {
      planStartTime,
      planEndTime,
      existingStops: existingStops.map(stop => ({
        start_time: stop.start_time || '18:00',
        end_time: stop.end_time || '19:30',
        duration_minutes: 90
      })),
      venueMetadata,
      userPreferences: {
        preferred_vibe: userPreferences?.preferred_vibe,
        favorite_time_blocks: userPreferences?.feedback_sentiment?.favorite_time_blocks
      }
    }
    
    return getSmartTimeSuggestion(input)
  }, [planStartTime, planEndTime, existingStops, venueMetadata, userPreferences])
}