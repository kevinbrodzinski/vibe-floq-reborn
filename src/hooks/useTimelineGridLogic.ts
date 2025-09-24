import { useMemo } from 'react'
import { checkStopConflicts } from '@/utils/conflict-utils'
import { useNovaTimeSuggestions } from './useNovaTimeSuggestions'
import type { PlanStop, SnapSuggestion } from '@/types/plan'

export interface TimelineStopData extends PlanStop {
  isDragging: boolean
  isConflicting: boolean
  snapSuggestion?: SnapSuggestion
}

export function useTimelineGridLogic(
  planStops: PlanStop[], 
  currentDragStopId?: string,
  planId?: string
) {
  const { suggestions } = useNovaTimeSuggestions(planStops)

  return useMemo(() => {
    const conflictingIds = checkStopConflicts(planStops)
    
    return planStops.map(stop => {
      const isDragging = stop.id === currentDragStopId
      const isConflicting = conflictingIds.has(stop.id)
      
      // Find AI suggestion for this stop
      const snapSuggestion = suggestions.find(s => 
        s.id === stop.id || 
        Math.abs(new Date(`2000-01-01T${s.startTime}`).getTime() - 
                 new Date(`2000-01-01T${stop.start_time}`).getTime()) < 30 * 60 * 1000
      )

      return {
        ...stop,
        isDragging,
        isConflicting,
        snapSuggestion: snapSuggestion ? {
          startTime: snapSuggestion.startTime,
          endTime: snapSuggestion.endTime,
          confidence: snapSuggestion.confidence,
          reason: snapSuggestion.reasoning?.[0]
        } : undefined
      } as TimelineStopData
    })
  }, [planStops, currentDragStopId, suggestions])
}